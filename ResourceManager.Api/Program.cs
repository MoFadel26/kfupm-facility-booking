using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpLogging;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using ResourceManager.Api.Data;
using ResourceManager.Api.Exceptions;
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

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddExceptionHandler<ApiExceptionHandler>();

// ApiExceptionHandler writes through this rather than serialising a ProblemDetails
// itself, which is what gets a traceId onto domain errors. MVC's automatic 400 for a
// failed annotation already carries one from its own factory.
builder.Services.AddProblemDetails();

// One log entry per request. Headers and bodies are deliberately excluded: they carry
// user data now and credentials once authentication lands.
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

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

// Outside the exception handler on purpose. Inside it, an exception unwinds past this
// middleware before the handler has written the real status, and every error gets logged
// as a 200.
app.UseHttpLogging();

app.UseExceptionHandler();
app.UseCors(FrontendCorsPolicy);

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
