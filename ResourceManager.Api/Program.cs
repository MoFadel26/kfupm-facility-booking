using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.HttpLogging;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using ResourceManager.Api.Authorization;
using ResourceManager.Api.Controllers;
using ResourceManager.Api.Data;
using ResourceManager.Api.Exceptions;
using ResourceManager.Api.Models;
using ResourceManager.Api.Services;

const string FrontendCorsPolicy = "Frontend";

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    options.UseNpgsql(connectionString);
});

builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IFacilityService, FacilityService>();
builder.Services.AddScoped<IReservationService, ReservationService>();
builder.Services.AddScoped<IEventParticipantService, EventParticipantService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// Issuer, audiences and signing keys bind from Authentication:Schemes:Bearer with no code
// here. TokenService reads the same section to issue tokens, so the two cannot disagree.
// Inbound claim mapping is off so `sub` stays `sub` instead of being renamed to a long
// ClaimTypes URI; it carries the user's KfupmId.
builder.Services.AddAuthentication().AddJwtBearer(options => options.MapInboundClaims = false);
builder.Services.AddScoped<IAuthorizationHandler, AdminHandler>();
builder.Services.AddAuthorization(options => options.AddPolicy(AdminRequirement.PolicyName, policy => policy
    .RequireAuthenticatedUser()
    .AddRequirements(new AdminRequirement())));

// The API signs its own tokens now, so a Production start without these would come up
// unable to log anyone in. Same reasoning as the CORS check below: fail at deploy time.
if (builder.Environment.IsProduction())
{
    string[] requiredBearerKeys = ["ValidIssuer", "ValidAudiences:0", "SigningKeys:0:Issuer", "SigningKeys:0:Value"];
    var missing = requiredBearerKeys
        .Where(key => string.IsNullOrWhiteSpace(builder.Configuration[$"Authentication:Schemes:Bearer:{key}"]))
        .ToArray();
    if (missing.Length > 0)
        throw new InvalidOperationException(
            "Authentication:Schemes:Bearer is missing " + string.Join(", ", missing) + ". Set them, "
            + "for example Authentication__Schemes__Bearer__ValidIssuer=resource-manager");
}

builder.Services.AddExceptionHandler<ApiExceptionHandler>();

// ApiExceptionHandler writes through this rather than serialising a ProblemDetails
// itself, which is what gets a traceId onto domain errors. MVC's automatic 400 for a
// failed annotation already carries one from its own factory.
builder.Services.AddProblemDetails();

// One log entry per request. Headers and bodies are deliberately excluded: they carry
// user data, passwords and bearer tokens.
builder.Services.AddHttpLogging(options =>
{
    options.LoggingFields = HttpLoggingFields.RequestMethod
                            | HttpLoggingFields.RequestPath
                            | HttpLoggingFields.RequestQuery
                            | HttpLoggingFields.ResponseStatusCode
                            | HttpLoggingFields.Duration;
    options.CombineLogs = true;
});

// The deployed frontend is not on localhost, and a wrong origin fails as a browser
// error far from its cause, so this is configuration rather than a constant. Production
// must say so explicitly: refusing to start is a better failure than every request from
// the real frontend being blocked by a value nobody remembered to change.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
if (allowedOrigins.Length == 0)
{
    if (builder.Environment.IsProduction())
        throw new InvalidOperationException(
            "Cors:AllowedOrigins is not configured. Set it to the origins the frontend is "
            + "served from, for example Cors__AllowedOrigins__0=https://example.com");

    allowedOrigins = ["http://localhost:5173"];
}

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod());
});

// Liveness deliberately checks nothing: it answers "is this process running", and a
// platform restarts the container when it fails. Readiness checks the database, because
// an instance that cannot reach it should stop receiving traffic — not be killed.
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database", tags: ["ready"]);

// Login and register are where passwords get guessed, so each client address gets a few
// attempts a minute across both. A fixed window is enough here: the point is to make
// guessing slow, not to shape traffic. The limit is configuration so tests can raise it.
var authPermitLimit = builder.Configuration.GetValue("RateLimiting:Auth:PermitLimit", 5);
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy(AuthController.RateLimitPolicy, context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = authPermitLimit,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        }));

    options.OnRejected = async (context, ct) =>
    {
        var response = context.HttpContext.Response;
        response.StatusCode = StatusCodes.Status429TooManyRequests;
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            response.Headers.RetryAfter = ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString();

        await context.HttpContext.RequestServices.GetRequiredService<IProblemDetailsService>()
            .TryWriteAsync(new ProblemDetailsContext
            {
                HttpContext = context.HttpContext,
                ProblemDetails = new ProblemDetails
                {
                    Status = StatusCodes.Status429TooManyRequests,
                    Title = "Too Many Requests",
                    Detail = "Too many sign-in attempts. Try again in a minute."
                }
            });
    };
});

// Behind Container Apps' ingress (or CloudFront) every request arrives from the proxy, so
// the rate limiter would put all clients in one bucket. The proxy appends the real client
// address to X-Forwarded-For, and with the default ForwardLimit of 1 only that last entry
// is used, so a value the client sent itself is ignored. The proxy's address is not fixed,
// so the known lists are cleared. That trusts the header from anyone who can reach the
// container directly, which on Container Apps is no one but the ingress.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

// Migrating on startup is convenient and fine for a single instance. Two instances
// starting together will race, and a failed migration takes the app down with it rather
// than failing a deploy step you can retry — so once this runs as more than one replica,
// set Database:MigrateOnStartup to false and run `dotnet ef database update` from the
// deployment pipeline instead.
if (builder.Configuration.GetValue("Database:MigrateOnStartup", true))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    // Sample data is on in development. Tests need an empty database, so they never get it.
    // A demo deployment has no way to add data through its read-only API, so it opts in
    // with Database:SeedSampleData.
    if (app.Environment.IsDevelopment() || builder.Configuration.GetValue("Database:SeedSampleData", false))
        await DbSeeder.SeedAsync(db);
}

// Configure the HTTP request pipeline.
// The API docs are on in development. A demo deployment opts in with ApiDocs:Enabled so
// visitors can browse the API.
if (app.Environment.IsDevelopment() || builder.Configuration.GetValue("ApiDocs:Enabled", false))
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

// Outside the exception handler on purpose. Inside it, an exception unwinds past this
// middleware before the handler has written the real status, and every error gets logged
// as a 200.
app.UseHttpLogging();

app.UseExceptionHandler();
app.UseCors(FrontendCorsPolicy);

// After CORS for the same reason as authentication below: a 429 must reach the browser.
app.UseRateLimiter();

// After CORS, so a 401 still carries the CORS headers and the browser shows the real
// status rather than a CORS error.
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false });
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.Run();

// Exposed so the integration tests can boot the real application through
// WebApplicationFactory<Program>. Top-level statements generate an internal
// Program class, which the factory cannot reach from another assembly.
public partial class Program;
