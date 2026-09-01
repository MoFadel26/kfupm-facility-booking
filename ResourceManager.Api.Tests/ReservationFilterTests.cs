using System.Net;
using ResourceManager.Api.DTO;

namespace ResourceManager.Api.Tests;

public class ReservationFilterTests : ApiTestBase
{
    public ReservationFilterTests(ApiFixture fixture) : base(fixture) { }

    /// <summary>Two users, two facilities, one reservation for each combination.</summary>
    private async Task SeedAsync()
    {
        await CreateFacilityAsync("F-A");
        await CreateFacilityAsync("F-B");
        await CreateUserAsync("202300001");
        await CreateUserAsync("202300002");

        var hour = 8;
        foreach (var facilityId in new[] { "F-A", "F-B" })
        foreach (var userId in new[] { "202300001", "202300002" })
        {
            (await PostReservationAsync(At(hour), At(hour + 1), facilityId, userId,
                reason: $"{facilityId} / {userId}")).EnsureSuccessStatusCode();
            hour++;
        }
    }

    [Fact]
    public async Task Filtering_by_user_returns_only_that_users_reservations()
    {
        await SeedAsync();

        var page = await GetPageAsync<ReservationResponse>("/api/reservations?userId=202300001");

        Assert.Equal(2, page.TotalCount);
        Assert.All(page.Items, r => Assert.Equal("202300001", r.UserId));
    }

    [Fact]
    public async Task Filtering_by_facility_returns_only_that_facilitys_reservations()
    {
        await SeedAsync();

        var page = await GetPageAsync<ReservationResponse>("/api/reservations?facilityId=F-A");

        Assert.Equal(2, page.TotalCount);
        Assert.All(page.Items, r => Assert.Equal("F-A", r.FacilityId));
    }

    /// <summary>
    /// Both filters used to be checked one after the other, so the second was silently
    /// dropped: asking for one user's bookings at one facility returned all of that
    /// user's bookings everywhere.
    /// </summary>
    [Fact]
    public async Task Filtering_by_user_and_facility_applies_both()
    {
        await SeedAsync();

        var page = await GetPageAsync<ReservationResponse>(
            "/api/reservations?userId=202300001&facilityId=F-A");

        var reservation = Assert.Single(page.Items);
        Assert.Equal("202300001", reservation.UserId);
        Assert.Equal("F-A", reservation.FacilityId);
        Assert.Equal(1, page.TotalCount);
    }

    [Theory]
    [InlineData("userId=999999999")]
    [InlineData("facilityId=F-NOPE")]
    public async Task Filtering_by_something_that_does_not_exist_is_not_found(string query)
    {
        await SeedAsync();

        var response = await Client.GetAsync($"/api/reservations?{query}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Filters_and_paging_combine()
    {
        await SeedAsync();

        var page = await GetPageAsync<ReservationResponse>(
            "/api/reservations?userId=202300001&page=2&pageSize=1");

        Assert.Single(page.Items);
        Assert.Equal(2, page.TotalCount);
        Assert.Equal(2, page.TotalPages);
        Assert.Equal(2, page.Page);
    }
}
