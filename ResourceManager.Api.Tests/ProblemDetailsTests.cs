using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace ResourceManager.Api.Tests;

/// <summary>
/// Every error response carries a trace id. Without it, a user reporting an error gives
/// us nothing to search the log for.
/// </summary>
public class ProblemDetailsTests : ApiTestBase
{
    public ProblemDetailsTests(ApiFixture fixture) : base(fixture) { }

    private static async Task<JsonElement> ReadProblemAsync(HttpResponseMessage response)
        => await response.Content.ReadFromJsonAsync<JsonElement>();

    private static void AssertHasTraceId(JsonElement problem)
    {
        Assert.True(problem.TryGetProperty("traceId", out var traceId),
            $"No traceId in: {problem}");
        Assert.False(string.IsNullOrWhiteSpace(traceId.GetString()));
    }

    [Fact]
    public async Task A_not_found_carries_a_trace_id()
    {
        var response = await Client.GetAsync($"/api/reservations/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        AssertHasTraceId(await ReadProblemAsync(response));
    }

    [Fact]
    public async Task A_conflict_carries_a_trace_id()
    {
        await CreateFacilityAsync();
        await CreateUserAsync();
        (await PostReservationAsync(At(10), At(12))).EnsureSuccessStatusCode();

        var response = await PostReservationAsync(At(11), At(13));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        AssertHasTraceId(await ReadProblemAsync(response));
    }

    /// <summary>
    /// This 400 is produced by MVC's model validation, which runs before the exception
    /// handler and builds its own ProblemDetails — a separate path that has to be
    /// configured separately.
    /// </summary>
    [Fact]
    public async Task An_annotation_failure_carries_a_trace_id()
    {
        await CreateFacilityAsync();
        await CreateUserAsync();

        var response = await PostReservationAsync(At(10), At(12), reason: "");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await ReadProblemAsync(response);
        AssertHasTraceId(problem);
        Assert.True(problem.TryGetProperty("errors", out _), "validation details were lost");
    }

    [Fact]
    public async Task A_business_rule_rejection_still_reports_its_reason()
    {
        await CreateFacilityAsync();
        await CreateUserAsync();

        var response = await PostReservationAsync(At(12), At(10));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await ReadProblemAsync(response);
        AssertHasTraceId(problem);
        Assert.Equal("EndTime must be after StartTime.", problem.GetProperty("detail").GetString());
    }
}
