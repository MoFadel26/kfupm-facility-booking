using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using ResourceManager.Api.DTO;

namespace ResourceManager.Api.Tests;

/// <summary>
/// Adding or removing a participant needs a bearer token. A user may add or remove
/// themselves; the reservation's owner and admins may add or remove anyone.
/// </summary>
public class ParticipantAuthTests : ApiTestBase
{
    private const string Owner = "202300001";
    private const string Joiner = "202300002";
    private const string Stranger = "202300003";

    public ParticipantAuthTests(ApiFixture fixture) : base(fixture) { }

    private async Task<string> OwnersReservationAsync(int targetParticipantCount = 5)
    {
        await CreateFacilityAsync();
        await CreateUserAsync(Owner);
        await CreateUserAsync(Joiner);
        await CreateUserAsync(Stranger);
        var response = await PostReservationAsync(At(10), At(12), userId: Owner,
            targetParticipantCount: targetParticipantCount);
        response.EnsureSuccessStatusCode();
        return (await ReadReservationAsync(response)).ReservationId;
    }

    private Task<HttpResponseMessage> JoinAsync(string? actingUserId, string userId, string reservationId)
        => SendAsync(HttpMethod.Post, "/api/eventparticipants", actingUserId,
            new CreateEventParticipantRequest { UserId = userId, ReservationId = reservationId });

    private async Task<Guid> JoinedAsync(string userId, string reservationId)
    {
        var response = await JoinAsync(userId, userId, reservationId);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<EventParticipantResponse>(ApiFixture.Json))!.Id;
    }

    [Fact]
    public async Task Adding_without_a_token_is_unauthorized()
    {
        var reservationId = await OwnersReservationAsync();

        var response = await JoinAsync(null, Joiner, reservationId);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData(Joiner)] // themselves
    [InlineData(Owner)] // the reservation's owner
    [InlineData(ApiFixture.AdminKfupmId)]
    public async Task Allowed_callers_can_add_a_participant(string actingUserId)
    {
        var reservationId = await OwnersReservationAsync();

        var response = await JoinAsync(actingUserId, Joiner, reservationId);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Adding_someone_else_to_another_users_reservation_is_forbidden()
    {
        var reservationId = await OwnersReservationAsync();

        var response = await JoinAsync(Stranger, Joiner, reservationId);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Removing_without_a_token_is_unauthorized()
    {
        var id = await JoinedAsync(Joiner, await OwnersReservationAsync());

        var response = await SendAsync(HttpMethod.Delete, $"/api/eventparticipants/{id}", userId: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Removing_someone_else_from_another_users_reservation_is_forbidden()
    {
        var id = await JoinedAsync(Joiner, await OwnersReservationAsync());

        var response = await SendAsync(HttpMethod.Delete, $"/api/eventparticipants/{id}", Stranger);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.True(await Fixture.QueryAsync(db => db.EventParticipants.AnyAsync(ep => ep.Id == id)));
    }

    [Theory]
    [InlineData(Joiner)]
    [InlineData(Owner)]
    [InlineData(ApiFixture.AdminKfupmId)]
    public async Task Allowed_callers_can_remove_a_participant(string actingUserId)
    {
        var id = await JoinedAsync(Joiner, await OwnersReservationAsync());

        var response = await SendAsync(HttpMethod.Delete, $"/api/eventparticipants/{id}", actingUserId);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}
