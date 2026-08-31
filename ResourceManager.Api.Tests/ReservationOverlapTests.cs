using System.Net;
using Microsoft.EntityFrameworkCore;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Tests;

/// <summary>
/// The rule: two non-cancelled reservations for the same facility may not overlap in time.
/// </summary>
public class ReservationOverlapTests : ApiTestBase
{
    public ReservationOverlapTests(ApiFixture fixture) : base(fixture) { }

    private async Task SetupAsync()
    {
        await CreateFacilityAsync();
        await CreateUserAsync();
    }

    [Fact]
    public async Task Overlapping_reservation_is_rejected()
    {
        await SetupAsync();
        (await PostReservationAsync(At(10), At(12))).EnsureSuccessStatusCode();

        var response = await PostReservationAsync(At(11), At(13));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Single(await Fixture.QueryAsync(db => db.Reservations.ToListAsync()));
    }

    [Theory]
    // A reservation ending exactly when the next begins is not an overlap.
    [InlineData(12, 14)]
    // Nor is one ending exactly when the existing one begins.
    [InlineData(8, 10)]
    public async Task Adjacent_reservations_are_allowed(int startHour, int endHour)
    {
        await SetupAsync();
        (await PostReservationAsync(At(10), At(12))).EnsureSuccessStatusCode();

        var response = await PostReservationAsync(At(startHour), At(endHour));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task The_same_slot_on_a_different_facility_is_allowed()
    {
        await SetupAsync();
        await CreateFacilityAsync("F-B22-125");
        (await PostReservationAsync(At(10), At(12))).EnsureSuccessStatusCode();

        var response = await PostReservationAsync(At(10), At(12), facilityId: "F-B22-125");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    /// <summary>
    /// Regression: the slot used to be guarded by a unique index on
    /// (FacilityId, StartTime, EndTime), which ignored Status. Rebooking a cancelled
    /// slot passed the service check, hit the index, and surfaced as a 500.
    /// </summary>
    [Fact]
    public async Task A_cancelled_reservation_releases_its_slot()
    {
        await SetupAsync();
        var created = await ReadReservationAsync(await PostReservationAsync(At(10), At(12)));

        (await PutReservationAsync(created.Id, At(10), At(12), ReservationStatus.Cancelled))
            .EnsureSuccessStatusCode();

        var response = await PostReservationAsync(At(10), At(12));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    /// <summary>
    /// A burst of identical bookings must still leave one reservation.
    ///
    /// This does not prove the race is closed: the service's pre-check usually wins the
    /// timing, and this passes even with the constraint dropped. It is a smoke test for
    /// the endpoint under concurrent load. The deterministic guard is
    /// <see cref="The_overlap_rule_is_enforced_by_a_database_constraint"/>, which fails
    /// the moment the constraint goes missing.
    /// </summary>
    [Fact]
    public async Task Concurrent_bookings_of_one_slot_create_exactly_one_reservation()
    {
        await SetupAsync();

        var attempts = await Task.WhenAll(
            Enumerable.Range(0, 20).Select(_ => PostReservationAsync(At(9), At(11))));

        var statuses = attempts.Select(a => a.StatusCode).ToList();
        Assert.Equal(1, statuses.Count(s => s == HttpStatusCode.Created));
        Assert.Equal(19, statuses.Count(s => s == HttpStatusCode.Conflict));
        Assert.Single(await Fixture.QueryAsync(db => db.Reservations.ToListAsync()));
    }

    /// <summary>
    /// Pins the migration, and is the only test that fails if the constraint is dropped —
    /// verified by removing it and re-running the suite. Every behavioural test above
    /// passes on the service pre-check alone, so without this one the race could return
    /// unnoticed.
    /// </summary>
    [Fact]
    public async Task The_overlap_rule_is_enforced_by_a_database_constraint()
    {
        var constraints = await Fixture.QueryAsync(db => db.Database
            .SqlQueryRaw<string>(
                """
                SELECT conname AS "Value" FROM pg_constraint
                WHERE conname = 'EX_Reservations_NoOverlap' AND contype = 'x'
                """)
            .ToListAsync());

        Assert.Single(constraints);
    }
}
