using System.Net;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Tests;

public class ReservationRulesTests : ApiTestBase
{
    public ReservationRulesTests(ApiFixture fixture) : base(fixture) { }

    private async Task SetupAsync()
    {
        await CreateFacilityAsync();
        await CreateUserAsync();
    }

    [Theory]
    [InlineData(12, 10)] // end before start
    [InlineData(10, 10)] // zero length
    public async Task A_reservation_must_end_after_it_starts(int startHour, int endHour)
    {
        await SetupAsync();

        var response = await PostReservationAsync(At(startHour), At(endHour));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Booking_an_unknown_facility_is_not_found()
    {
        await SetupAsync();

        var response = await PostReservationAsync(At(10), At(12), facilityId: "F-DOES-NOT-EXIST");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Booking_as_an_unknown_user_is_not_found()
    {
        await SetupAsync();

        var response = await PostReservationAsync(At(10), At(12), userId: "999999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task A_gender_restricted_facility_rejects_a_user_of_another_gender()
    {
        await CreateFacilityAsync("F-POOL-W", allowedGender: AllowedGender.Female);
        await CreateUserAsync("202300002", gender: Gender.Male);

        var response = await PostReservationAsync(At(10), At(12), "F-POOL-W", "202300002");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task A_role_restricted_facility_rejects_a_user_of_another_role()
    {
        await CreateFacilityAsync("F-STAFF-GYM", allowedRole: AllowedRole.Faculty);
        await CreateUserAsync("202300003", role: UserRole.Student);

        var response = await PostReservationAsync(At(10), At(12), "F-STAFF-GYM", "202300003");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task A_restricted_facility_accepts_a_matching_user()
    {
        await CreateFacilityAsync("F-POOL-W", allowedGender: AllowedGender.Female);
        await CreateUserAsync("202300004", gender: Gender.Female);

        var response = await PostReservationAsync(At(10), At(12), "F-POOL-W", "202300004");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    /// <summary>
    /// The overlap check excludes the reservation being updated by passing its id, and
    /// passes null when creating. Both paths go through the same nullable comparison
    /// (r.Id != excludeReservationId), which is only correct if EF compensates for SQL's
    /// null semantics — so exercise a move with nothing else in the way.
    /// </summary>
    [Fact]
    public async Task A_reservation_can_be_moved_when_nothing_else_is_booked()
    {
        await SetupAsync();
        var created = await ReadReservationAsync(await PostReservationAsync(At(10), At(12)));

        var response = await PutReservationAsync(created.Id, At(14), At(16));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await ReadReservationAsync(response);
        Assert.Equal(At(14), updated.StartTime);
    }

    [Fact]
    public async Task A_reservation_cannot_be_moved_onto_another_reservations_slot()
    {
        await SetupAsync();
        var created = await ReadReservationAsync(await PostReservationAsync(At(10), At(12)));
        (await PostReservationAsync(At(14), At(16))).EnsureSuccessStatusCode();

        var response = await PutReservationAsync(created.Id, At(15), At(17));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task A_reservation_can_be_left_in_place_by_an_update()
    {
        await SetupAsync();
        var created = await ReadReservationAsync(await PostReservationAsync(At(10), At(12)));

        var response = await PutReservationAsync(
            created.Id, At(10), At(12), reason: "Renamed", targetParticipantCount: 5);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await ReadReservationAsync(response);
        Assert.Equal("Renamed", updated.Reason);
        Assert.Equal(5, updated.TargetParticipantCount);
    }
}
