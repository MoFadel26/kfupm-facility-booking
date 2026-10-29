using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using ResourceManager.Api.Data;
using ResourceManager.Api.Models;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Tests;

/// <summary>
/// Boots the real application against a throwaway PostgreSQL database.
///
/// A real database is not optional here: the reservation overlap rule is a
/// PostgreSQL exclusion constraint over a tstzrange, so the in-memory and SQLite
/// providers cannot express it and would report passing tests for a broken rule.
///
/// The server is pointed at a database created for this run and dropped afterwards.
/// Set TEST_POSTGRES_CONNECTION to aim at a different server (CI does).
/// </summary>
public sealed class ApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly string _databaseName = $"resource_manager_test_{Guid.NewGuid():N}";

    // The app validates tokens against these, set below the same way production sets
    // them. A fresh key per run means no test secret exists anywhere to leak.
    private const string TokenIssuer = "resource-manager-tests";
    private const string TokenAudience = "resource-manager-api";
    private readonly byte[] _signingKey = RandomNumberGenerator.GetBytes(32);

    /// <summary>
    /// An admin present in every test, because creating users and facilities now needs one.
    /// Its id and email are unlike any a test makes, so the users a test creates never
    /// collide with it.
    /// </summary>
    public const string AdminKfupmId = "100000000";

    /// <summary>The id that registration turns into an admin.</summary>
    public const string BootstrapAdminKfupmId = "200000000";

    private static string AdminConnectionString =>
        Environment.GetEnvironmentVariable("TEST_POSTGRES_CONNECTION")
        ?? $"Host=localhost;Port=5432;Database=postgres;Username={Environment.UserName};";

    private string TestConnectionString
    {
        get
        {
            var builder = new NpgsqlConnectionStringBuilder(AdminConnectionString)
            {
                Database = _databaseName
            };
            return builder.ConnectionString;
        }
    }

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    async Task IAsyncLifetime.InitializeAsync()
    {
        await using var connection = new NpgsqlConnection(AdminConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = $"""CREATE DATABASE "{_databaseName}";""";
        await command.ExecuteNonQueryAsync();

        // Force the host to build now, so migrations run before any test does.
        // Program.cs applies them on startup; that is what installs the exclusion
        // constraint the overlap tests depend on.
        using var scope = Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.CanConnectAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Not Development: that would run DbSeeder and give every test a facility,
        // a user and a reservation it did not ask for.
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:DefaultConnection", TestConnectionString);

        builder.UseSetting("Authentication:Schemes:Bearer:ValidIssuer", TokenIssuer);
        builder.UseSetting("Authentication:Schemes:Bearer:ValidAudiences:0", TokenAudience);
        builder.UseSetting("Authentication:Schemes:Bearer:SigningKeys:0:Issuer", TokenIssuer);
        builder.UseSetting("Authentication:Schemes:Bearer:SigningKeys:0:Value", Convert.ToBase64String(_signingKey));

        builder.UseSetting("Bootstrap:AdminKfupmId", BootstrapAdminKfupmId);
        // Every test client shares one address, so the real limit of 5 a minute would
        // trip across unrelated tests. AuthRateLimitTests sets it back for its own host.
        builder.UseSetting("RateLimiting:Auth:PermitLimit", "10000");
    }

    /// <summary>An HS256 bearer token whose <c>sub</c> is the given KfupmId.</summary>
    public string CreateToken(string kfupmId)
        => new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = TokenIssuer,
            Audience = TokenAudience,
            Claims = new Dictionary<string, object> { [JwtRegisteredClaimNames.Sub] = kfupmId },
            Expires = DateTime.UtcNow.AddMinutes(10),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(_signingKey), SecurityAlgorithms.HmacSha256)
        });

    /// <summary>
    /// Empties every table, then adds back the test admin. Call at the start of each test —
    /// they share one database.
    /// </summary>
    public async Task ResetAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.ExecuteSqlRawAsync(
            """TRUNCATE "EventParticipants", "Reservations", "Users", "Facilities" CASCADE;""");

        db.Users.Add(new User(AdminKfupmId, "Test Admin", "test-admin@kfupm.edu.sa", UserRole.Admin, Gender.Male));
        await db.SaveChangesAsync();
    }

    public async Task<T> QueryAsync<T>(Func<AppDbContext, Task<T>> query)
    {
        using var scope = Services.CreateScope();
        return await query(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();

        NpgsqlConnection.ClearAllPools();
        await using var connection = new NpgsqlConnection(AdminConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = $"""DROP DATABASE IF EXISTS "{_databaseName}" WITH (FORCE);""";
        await command.ExecuteNonQueryAsync();
    }
}

[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<ApiFixture>
{
    public const string Name = "api";
}
