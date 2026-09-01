using System.Net;

namespace ResourceManager.Api.Tests;

/// <summary>
/// Liveness and readiness answer different questions, and a platform reacts differently
/// to each: a failed liveness check restarts the container, a failed readiness check only
/// stops traffic reaching it. Checking the database in liveness would mean a database
/// blip restarts every instance.
/// </summary>
public class HealthCheckTests : ApiTestBase
{
    public HealthCheckTests(ApiFixture fixture) : base(fixture) { }

    [Fact]
    public async Task Liveness_reports_healthy_without_touching_the_database()
    {
        var response = await Client.GetAsync("/health/live");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Readiness_reports_healthy_when_the_database_is_reachable()
    {
        var response = await Client.GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }
}
