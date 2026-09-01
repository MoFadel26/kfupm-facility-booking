using System.Text.Json.Serialization;
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

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy => policy
        .WithOrigins("http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    // Sample data is for local development only. Tests need an empty database and
    // production needs its own, so neither gets it.
    if (app.Environment.IsDevelopment())
        await DbSeeder.SeedAsync(db);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}
else
{
    app.UseHttpsRedirection();
}

// Outside the exception handler on purpose. Inside it, an exception unwinds past this
// middleware before the handler has written the real status, and every error gets logged
// as a 200.
app.UseHttpLogging();

app.UseExceptionHandler();
app.UseCors(FrontendCorsPolicy);

app.MapControllers();

app.Run();

// Exposed so the integration tests can boot the real application through
// WebApplicationFactory<Program>. Top-level statements generate an internal
// Program class, which the factory cannot reach from another assembly.
public partial class Program;
