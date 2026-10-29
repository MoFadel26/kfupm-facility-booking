using System.Text.RegularExpressions;

namespace ResourceManager.Api.Tests;

/// <summary>
/// ReservationId is random and unique-indexed, so its length decides how soon two bookings
/// draw the same one. 8 hex digits collided under load at a few hundred thousand rows.
/// </summary>
public class ReservationIdTests : ApiTestBase
{
    public ReservationIdTests(ApiFixture fixture) : base(fixture) { }

    [Fact]
    public async Task Reservation_id_has_sixteen_hex_digits()
    {
        await CreateFacilityAsync();
        await CreateUserAsync();

        var first = await ReadReservationAsync(await PostReservationAsync(At(10), At(11)));
        var second = await ReadReservationAsync(await PostReservationAsync(At(11), At(12)));

        Assert.Matches(new Regex("^RES-[0-9A-F]{16}$"), first.ReservationId);
        Assert.Matches(new Regex("^RES-[0-9A-F]{16}$"), second.ReservationId);
        Assert.NotEqual(first.ReservationId, second.ReservationId);
    }
}
