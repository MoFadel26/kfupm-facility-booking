using System.Net;
using Microsoft.EntityFrameworkCore;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Tests;

/// <summary>
/// Reservation writes need a bearer token, the reservation belongs to whoever the token
/// names, and only that owner or an admin can change it afterwards.
/// </summary>
public class ReservationAuthTests : ApiTestBase
{
    private const string Owner = "202300001";
    private const string OtherStudent = "202300002";
    private const string Admin = "202300009";

    public ReservationAuthTests(ApiFixture fixture) : base(fixture) { }

    private async Task<Guid> OwnersReservationAsync()
    {
        await CreateFacilityAsync();
        await CreateUserAsync(Owner);
        var response = await PostReservationAsync(At(10), At(12), userId: Owner);
        response.EnsureSuccessStatusCode();
        return (await ReadReservationAsync(response)).Id;
    }

    private Task<ReservationStatus> StatusOfAsync(Guid id)
        => Fixture.QueryAsync(db => db.Reservations.Where(r => r.Id == id).Select(r => r.Status).SingleAsync());

    private Task<bool> ExistsAsync(Guid id)
        => Fixture.QueryAsync(db => db.Reservations.AnyAsync(r => r.Id == id));

    [Fact]
    public async Task Booking_without_a_token_is_unauthorized()
    {
        await CreateFacilityAsync();
        await CreateUserAsync(Owner);

        var response = await SendAsync(HttpMethod.Post, "/api/reservations", userId: null, new
        {
            StartTime = At(10),
            EndTime = At(12),
            Reason = "Project meeting",
            TargetParticipantCount = 2,
            FacilityId = "F-B22-124"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Booking_with_a_token_for_an_unknown_user_is_forbidden()
    {
        await CreateFacilityAsync();

        var response = await PostReservationAsync(At(10), At(12), userId: "999999999");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    /// <summary>Older clients still send userId. It must not let them book as someone else.</summary>
    [Fact]
    public async Task The_reservation_belongs_to_the_token_user_not_a_userId_in_the_body()
    {
        await CreateFacilityAsync();
        await CreateUserAsync(Owner);
        await CreateUserAsync(OtherStudent);

        var response = await SendAsync(HttpMethod.Post, "/api/reservations", Owner, new
        {
            StartTime = At(10),
            EndTime = At(12),
            Reason = "Project meeting",
            TargetParticipantCount = 2,
            FacilityId = "F-B22-124",
            UserId = OtherStudent
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(Owner, (await ReadReservationAsync(response)).UserId);
    }

    [Fact]
    public async Task Someone_else_cannot_update_the_reservation()
    {
        var id = await OwnersReservationAsync();
        await CreateUserAsync(OtherStudent);

        var response = await PutReservationAsync(id, At(10), At(12), ReservationStatus.Cancelled, userId: OtherStudent);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(ReservationStatus.Pending, await StatusOfAsync(id));
    }

    [Fact]
    public async Task Someone_else_cannot_delete_the_reservation()
    {
        var id = await OwnersReservationAsync();
        await CreateUserAsync(OtherStudent);

        var response = await SendAsync(HttpMethod.Delete, $"/api/reservations/{id}", OtherStudent);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.True(await ExistsAsync(id));
    }

    [Fact]
    public async Task The_owner_can_cancel()
    {
        var id = await OwnersReservationAsync();

        var response = await PutReservationAsync(id, At(10), At(12), ReservationStatus.Cancelled, userId: Owner);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(ReservationStatus.Cancelled, (await ReadReservationAsync(response)).Status);
    }

    [Fact]
    public async Task An_admin_can_cancel_someone_elses_reservation()
    {
        var id = await OwnersReservationAsync();
        await CreateUserAsync(Admin, UserRole.Admin);

        var response = await PutReservationAsync(id, At(10), At(12), ReservationStatus.Cancelled, userId: Admin);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(ReservationStatus.Cancelled, (await ReadReservationAsync(response)).Status);
    }

    [Fact]
    public async Task Deleting_without_a_token_is_unauthorized()
    {
        var id = await OwnersReservationAsync();

        var response = await SendAsync(HttpMethod.Delete, $"/api/reservations/{id}", userId: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.True(await ExistsAsync(id));
    }
}
