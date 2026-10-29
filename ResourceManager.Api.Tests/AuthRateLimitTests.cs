using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using ResourceManager.Api.DTO;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Tests;

/// <summary>
/// Login and register share a limit of 5 attempts a minute per client address. The shared
/// fixture raises the limit, so this test runs its own host with the real one.
/// </summary>
public class AuthRateLimitTests : ApiTestBase
{
    public AuthRateLimitTests(ApiFixture fixture) : base(fixture) { }

    [Fact]
    public async Task The_sixth_sign_in_attempt_in_a_minute_is_refused()
    {
        using var factory = Fixture.WithWebHostBuilder(builder =>
            builder.UseSetting("RateLimiting:Auth:PermitLimit", "5"));
        using var client = factory.CreateClient();
        var login = new LoginRequest { KfupmId = "202399999", Password = "wrong password" };

        for (var attempt = 1; attempt <= 5; attempt++)
        {
            var allowed = await client.PostAsJsonAsync("/api/auth/login", login, ApiFixture.Json);
            Assert.Equal(HttpStatusCode.Unauthorized, allowed.StatusCode);
        }

        // Register draws on the same allowance as login.
        var refused = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            KfupmId = "202300001",
            Name = "Late Comer",
            Email = "late@kfupm.edu.sa",
            Gender = Gender.Male,
            Password = "late-comer-password"
        }, ApiFixture.Json);

        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        Assert.True(refused.Headers.RetryAfter is not null, "429 should say when to retry");
        var problem = await refused.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal(429, problem!.Status);
    }

    [Fact]
    public async Task Other_endpoints_are_not_limited()
    {
        using var factory = Fixture.WithWebHostBuilder(builder =>
            builder.UseSetting("RateLimiting:Auth:PermitLimit", "5"));
        using var client = factory.CreateClient();

        for (var request = 1; request <= 10; request++)
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/facilities")).StatusCode);
    }
}
