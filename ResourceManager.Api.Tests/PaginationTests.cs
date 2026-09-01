using System.Net;
using System.Net.Http.Json;
using ResourceManager.Api.DTO;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Tests;

public class PaginationTests : ApiTestBase
{
    public PaginationTests(ApiFixture fixture) : base(fixture) { }

    /// <summary>Back-to-back hourly slots, so none of them overlap.</summary>
    private async Task SeedReservationsAsync(int count)
    {
        await CreateFacilityAsync();
        await CreateUserAsync();
        for (var hour = 0; hour < count; hour++)
            (await PostReservationAsync(At(hour), At(hour + 1), reason: $"Slot {hour:00}"))
                .EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task A_request_without_paging_parameters_gets_the_first_page()
    {
        await SeedReservationsAsync(3);

        var page = await GetPageAsync<ReservationResponse>("/api/reservations");

        Assert.Equal(1, page.Page);
        Assert.Equal(PageQuery.DefaultPageSize, page.PageSize);
        Assert.Equal(3, page.TotalCount);
        Assert.Equal(1, page.TotalPages);
        Assert.Equal(3, page.Items.Count);
    }

    [Fact]
    public async Task A_page_is_capped_at_the_requested_size()
    {
        await SeedReservationsAsync(10);

        var page = await GetPageAsync<ReservationResponse>("/api/reservations?page=1&pageSize=4");

        Assert.Equal(4, page.Items.Count);
        Assert.Equal(10, page.TotalCount);
        Assert.Equal(3, page.TotalPages); // 4 + 4 + 2
    }

    [Fact]
    public async Task Paging_through_covers_every_row_exactly_once()
    {
        await SeedReservationsAsync(10);

        var seen = new List<Guid>();
        for (var pageNumber = 1; pageNumber <= 3; pageNumber++)
        {
            var page = await GetPageAsync<ReservationResponse>(
                $"/api/reservations?page={pageNumber}&pageSize=4");
            seen.AddRange(page.Items.Select(r => r.Id));
        }

        Assert.Equal(10, seen.Count);
        Assert.Equal(10, seen.Distinct().Count());
    }

    [Fact]
    public async Task A_page_beyond_the_end_is_empty_rather_than_an_error()
    {
        await SeedReservationsAsync(3);

        var page = await GetPageAsync<ReservationResponse>("/api/reservations?page=99&pageSize=10");

        Assert.Empty(page.Items);
        Assert.Equal(3, page.TotalCount);
    }

    /// <summary>
    /// Offset paging is only stable if the sort key is unique. These users all share a name,
    /// so ordering by name alone leaves the database free to return them in a different
    /// order per page — which shows up as a row appearing twice, or never.
    /// </summary>
    [Fact]
    public async Task Rows_sharing_a_sort_key_still_page_without_gaps_or_repeats()
    {
        for (var i = 0; i < 12; i++)
            (await Client.PostAsJsonAsync("/api/users", new UserRequest
            {
                KfupmId = $"2023000{i:00}",
                Name = "Identical Name",
                Email = $"user{i:00}@kfupm.edu.sa",
                Role = UserRole.Student,
                Gender = Gender.Male
            }, ApiFixture.Json)).EnsureSuccessStatusCode();

        var seen = new List<Guid>();
        for (var pageNumber = 1; pageNumber <= 4; pageNumber++)
        {
            var page = await GetPageAsync<UserResponse>($"/api/users?page={pageNumber}&pageSize=3");
            seen.AddRange(page.Items.Select(u => u.Id));
        }

        Assert.Equal(12, seen.Count);
        Assert.Equal(12, seen.Distinct().Count());
    }

    [Theory]
    [InlineData("page=0")]
    [InlineData("page=-1")]
    [InlineData("pageSize=0")]
    [InlineData("pageSize=101")] // above PageQuery.MaxPageSize
    public async Task Nonsensical_paging_parameters_are_rejected(string query)
    {
        var response = await Client.GetAsync($"/api/reservations?{query}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Every_list_endpoint_is_paged()
    {
        await SeedReservationsAsync(1);

        foreach (var url in new[] { "/api/reservations", "/api/users", "/api/facilities", "/api/eventparticipants" })
        {
            var page = await GetPageAsync<object>(url);
            Assert.Equal(PageQuery.DefaultPageSize, page.PageSize);
        }
    }
}
