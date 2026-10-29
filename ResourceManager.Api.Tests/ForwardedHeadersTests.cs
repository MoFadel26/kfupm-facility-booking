using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using ResourceManager.Api.DTO;

namespace ResourceManager.Api.Tests;

/// <summary>
/// The sign-in rate limit is keyed by client address, so X-Forwarded-For decides the
/// bucket. It may only be believed when it comes from a trusted proxy; otherwise a client
/// gets a fresh bucket per request by sending a new value each time.
/// </summary>
public class ForwardedHeadersTests : ApiTestBase
{
    private const string TrustedProxy = "10.1.2.3";
    private const string DirectClient = "203.0.113.10";

    public ForwardedHeadersTests(ApiFixture fixture) : base(fixture) { }

    /// <summary>
    /// A host with the real limit of 5, where every request arrives from
    /// <paramref name="remoteAddress"/>. TestServer leaves the remote address empty, and the
    /// forwarded headers middleware believes the header from an empty address, so these
    /// tests set one the way Kestrel would.
    /// </summary>
    private WebApplicationFactory<Program> HostSeenFrom(string remoteAddress, string? trustedNetwork = null)
        => Fixture.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("RateLimiting:Auth:PermitLimit", "5");
            if (trustedNetwork is not null)
                builder.UseSetting("ForwardedHeaders:KnownNetworks:0", trustedNetwork);
            builder.ConfigureServices(services =>
                services.AddSingleton<IStartupFilter>(new RemoteAddressFilter(IPAddress.Parse(remoteAddress))));
        });

    private static Task<HttpResponseMessage> LoginAsync(HttpClient client, string forwardedFor)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(
                new LoginRequest { KfupmId = "202399999", Password = "wrong password" }, options: ApiFixture.Json)
        };
        request.Headers.Add("X-Forwarded-For", forwardedFor);
        return client.SendAsync(request);
    }

    [Fact]
    public async Task A_direct_client_cannot_escape_the_limit_by_changing_x_forwarded_for()
    {
        using var factory = HostSeenFrom(DirectClient);
        using var client = factory.CreateClient();

        for (var attempt = 1; attempt <= 5; attempt++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(client, $"198.51.100.{attempt}")).StatusCode);

        Assert.Equal(HttpStatusCode.TooManyRequests, (await LoginAsync(client, "198.51.100.6")).StatusCode);
    }

    [Fact]
    public async Task Behind_a_trusted_proxy_each_client_address_has_its_own_limit()
    {
        using var factory = HostSeenFrom(TrustedProxy, trustedNetwork: "10.0.0.0/8");
        using var client = factory.CreateClient();

        for (var attempt = 1; attempt <= 5; attempt++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(client, "198.51.100.1")).StatusCode);

        Assert.Equal(HttpStatusCode.TooManyRequests, (await LoginAsync(client, "198.51.100.1")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(client, "198.51.100.2")).StatusCode);
    }

    [Fact]
    public async Task Behind_a_trusted_proxy_only_the_address_it_appended_counts()
    {
        using var factory = HostSeenFrom(TrustedProxy, trustedNetwork: "10.0.0.0/8");
        using var client = factory.CreateClient();

        // The client puts its own value first; the proxy appends the real address last.
        for (var attempt = 1; attempt <= 5; attempt++)
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await LoginAsync(client, $"192.0.2.{attempt}, 198.51.100.1")).StatusCode);

        Assert.Equal(HttpStatusCode.TooManyRequests,
            (await LoginAsync(client, "192.0.2.6, 198.51.100.1")).StatusCode);
    }

    private sealed class RemoteAddressFilter(IPAddress address) : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            app.Use((context, nextMiddleware) =>
            {
                context.Connection.RemoteIpAddress = address;
                return nextMiddleware(context);
            });
            next(app);
        };
    }
}
