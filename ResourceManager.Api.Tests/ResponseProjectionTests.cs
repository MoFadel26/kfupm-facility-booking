using System.Net.Http.Json;
using ResourceManager.Api.DTO;

namespace ResourceManager.Api.Tests;

/// <summary>
/// Responses carry fields that live on related tables — the facility's name, the booking
/// user's name, a participant's reservation reason. They are produced by a projection EF
/// turns into a join, so a mistake there drops them silently to null or empty rather than
/// failing. These assert they survive on every read path.
/// </summary>
public class ResponseProjectionTests : ApiTestBase
{
    public ResponseProjectionTests(ApiFixture fixture) : base(fixture) { }

    private async Task ArrangeAsync()
    {
        await CreateFacilityAsync();
        await CreateUserAsync();
        (await PostReservationAsync(At(10), At(12))).EnsureSuccessStatusCode();
    }

    private static void AssertJoinedFields(ReservationResponse reservation)
    {
        Assert.Equal("F-B22-124", reservation.FacilityId);
        Assert.Equal("Facility F-B22-124", reservation.FacilityName);
        Assert.Equal("202300001", reservation.UserId);
        Assert.Equal("User 202300001", reservation.UserName);
    }

    [Fact]
    public async Task Listing_reservations_includes_the_facility_and_user_names()
    {
        await ArrangeAsync();

        var reservations = await GetPageAsync<ReservationResponse>("/api/reservations");

        AssertJoinedFields(Assert.Single(reservations.Items));
    }

    [Fact]
    public async Task Filtering_reservations_includes_the_facility_and_user_names()
    {
        await ArrangeAsync();

        var byUser = await GetPageAsync<ReservationResponse>("/api/reservations?userId=202300001");
        var byFacility = await GetPageAsync<ReservationResponse>("/api/reservations?facilityId=F-B22-124");

        AssertJoinedFields(Assert.Single(byUser.Items));
        AssertJoinedFields(Assert.Single(byFacility.Items));
    }

    [Fact]
    public async Task Fetching_one_reservation_includes_the_facility_and_user_names()
    {
        await ArrangeAsync();
        var listed = await GetPageAsync<ReservationResponse>("/api/reservations");

        var reservation = await Client.GetFromJsonAsync<ReservationResponse>(
            $"/api/reservations/{listed.Items[0].Id}", ApiFixture.Json);

        AssertJoinedFields(reservation!);
    }

    [Fact]
    public async Task Creating_a_reservation_returns_the_facility_and_user_names()
    {
        await CreateFacilityAsync();
        await CreateUserAsync();

        var response = await PostReservationAsync(At(10), At(12));

        AssertJoinedFields(await ReadReservationAsync(response));
    }

    [Fact]
    public async Task Participants_carry_the_user_name_and_reservation_reason()
    {
        await ArrangeAsync();
        var reservation = (await GetPageAsync<ReservationResponse>("/api/reservations")).Items[0];

        var created = await Client.PostAsJsonAsync("/api/eventparticipants",
            new CreateEventParticipantRequest
            {
                UserId = "202300001",
                ReservationId = reservation.ReservationId
            }, ApiFixture.Json);
        created.EnsureSuccessStatusCode();

        var participants = await GetPageAsync<EventParticipantResponse>("/api/eventparticipants");

        var participant = Assert.Single(participants.Items);
        Assert.Equal("User 202300001", participant.UserName);
        Assert.Equal("Project meeting", participant.ReservationReason);
    }
}
