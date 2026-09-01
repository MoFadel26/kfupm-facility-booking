using System.Net;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Tests;

/// <summary>
/// A reservation moves Pending -> Confirmed -> Cancelled, and cancellation is final.
/// Who is allowed to make each move is a separate question, and needs authentication;
/// which moves exist at all does not.
/// </summary>
public class ReservationStatusTests : ApiTestBase
{
    public ReservationStatusTests(ApiFixture fixture) : base(fixture) { }

    private async Task<Guid> ReservationInAsync(ReservationStatus status)
    {
        await CreateFacilityAsync();
        await CreateUserAsync();
        var created = await ReadReservationAsync(await PostReservationAsync(At(10), At(12)));

        if (status != ReservationStatus.Pending)
            (await PutReservationAsync(created.Id, At(10), At(12), status)).EnsureSuccessStatusCode();

        return created.Id;
    }

    [Theory]
    [InlineData(ReservationStatus.Pending, ReservationStatus.Confirmed)]
    [InlineData(ReservationStatus.Pending, ReservationStatus.Cancelled)]
    [InlineData(ReservationStatus.Pending, ReservationStatus.Pending)]
    [InlineData(ReservationStatus.Confirmed, ReservationStatus.Cancelled)]
    [InlineData(ReservationStatus.Confirmed, ReservationStatus.Confirmed)]
    [InlineData(ReservationStatus.Cancelled, ReservationStatus.Cancelled)]
    public async Task Allowed_transitions_succeed(ReservationStatus from, ReservationStatus to)
    {
        var id = await ReservationInAsync(from);

        var response = await PutReservationAsync(id, At(10), At(12), to);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(to, (await ReadReservationAsync(response)).Status);
    }

    [Theory]
    [InlineData(ReservationStatus.Cancelled, ReservationStatus.Confirmed)]
    [InlineData(ReservationStatus.Cancelled, ReservationStatus.Pending)]
    [InlineData(ReservationStatus.Confirmed, ReservationStatus.Pending)]
    public async Task Rejected_transitions_conflict(ReservationStatus from, ReservationStatus to)
    {
        var id = await ReservationInAsync(from);

        var response = await PutReservationAsync(id, At(10), At(12), to);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    /// <summary>
    /// Cancelling frees the slot, so someone else can take it. Reviving the cancelled
    /// reservation would then double-book the facility.
    /// </summary>
    [Fact]
    public async Task A_cancelled_reservation_cannot_be_revived_onto_a_slot_since_taken()
    {
        await CreateFacilityAsync();
        await CreateUserAsync();
        var first = await ReadReservationAsync(await PostReservationAsync(At(10), At(12)));
        (await PutReservationAsync(first.Id, At(10), At(12), ReservationStatus.Cancelled))
            .EnsureSuccessStatusCode();
        (await PostReservationAsync(At(10), At(12))).EnsureSuccessStatusCode();

        var response = await PutReservationAsync(first.Id, At(10), At(12), ReservationStatus.Confirmed);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var confirmed = await Fixture.QueryAsync(db => Task.FromResult(
            db.Reservations.Count(r => r.Status != ReservationStatus.Cancelled)));
        Assert.Equal(1, confirmed);
    }
}
