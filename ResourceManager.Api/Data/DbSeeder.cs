using Microsoft.EntityFrameworkCore;
using ResourceManager.Api.Models;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Data;

/// <summary>
/// Development sample data. This used to run from <see cref="AppDbContext.OnConfiguring"/> via
/// EF's UseSeeding hook, which fired on every migration in every environment — including
/// production, and including test databases that need to start empty. It is now an explicit
/// step the host decides to take.
/// </summary>
public static class DbSeeder
{
    /// <summary>Inserts sample data if the database has no users yet. Safe to call repeatedly.</summary>
    public static async Task SeedAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        if (await context.Users.AnyAsync(cancellationToken))
            return;

        var facility = new Facility(
            facilityId: "F-B22-124",
            name: "B22 - Room 124",
            type: FacilityType.Classroom,
            allowedGender: AllowedGender.Any,
            allowedRole: AllowedRole.Any);

        var user = new User(
            kfupmId: "202300001",
            name: "Ahmed Al-Fadel",
            email: "s202300001@kfupm.edu.sa",
            role: UserRole.Student,
            gender: Gender.Male);

        var reservationStart = DateTimeOffset.UtcNow.AddDays(1);
        var reservation = new Reservation(
            reservationId: "RES-1001",
            startTime: reservationStart,
            endTime: reservationStart.AddHours(2),
            reason: "Project Meeting",
            targetParticipantCount: 4,
            facilityId: facility.FacilityId,
            userId: user.KfupmId,
            status: ReservationStatus.Confirmed);

        var participant = new EventParticipant(
            userId: user.KfupmId,
            reservationId: reservation.ReservationId);

        context.AddRange(facility, user, reservation, participant);
        await context.SaveChangesAsync(cancellationToken);
    }
}
