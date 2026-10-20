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
    /// <summary>
    /// KFUPM facilities, taken from public KFUPM pages (campus life, Community Center, libraries)
    /// and a published venue guide. The Community Center is assumed to be Building 29, the staff
    /// and faculty community space. A facility allows one role only, so the Community Center
    /// uses Faculty even though staff use it too.
    /// </summary>
    private static Facility[] Facilities() =>
    [
        new("F-B22-124", "B22 - Room 124", FacilityType.Classroom),

        // Student sports
        new("F-B11-SPORTS", "B11 - Sports Center", FacilityType.Gym, AllowedGender.Male, AllowedRole.Student),
        new("F-B39-POOL", "B39 - Swimming Pool", FacilityType.SwimmingPool, AllowedGender.Male, AllowedRole.Student),
        new("F-B39-GYM", "B39 - Gym", FacilityType.Gym, AllowedGender.Male, AllowedRole.Student),
        new("F-B404-SPORTS", "B404 - Women's Sports Center", FacilityType.Gym, AllowedGender.Female, AllowedRole.Student),
        new("F-B406-SPORTS", "B406 - Women's Sports Center", FacilityType.Gym, AllowedGender.Female, AllowedRole.Student),
        new("F-B36-STADIUM", "B36 - University Stadium", FacilityType.SportsCourt),

        // Community Center
        new("F-B29-POOL-M", "Community Center - Men's Pool", FacilityType.SwimmingPool, AllowedGender.Male, AllowedRole.Faculty),
        new("F-B29-POOL-W", "Community Center - Women's Pool", FacilityType.SwimmingPool, AllowedGender.Female, AllowedRole.Faculty),
        new("F-B29-GYM-M", "Community Center - Men's Gym", FacilityType.Gym, AllowedGender.Male, AllowedRole.Faculty),
        new("F-B29-GYM-W", "Community Center - Women's Gym", FacilityType.Gym, AllowedGender.Female, AllowedRole.Faculty),
        new("F-B29-HALL", "Community Center - Indoor Sports Hall", FacilityType.SportsCourt, allowedRole: AllowedRole.Faculty),
        new("F-B29-SQUASH", "Community Center - Squash Courts", FacilityType.SportsCourt, allowedRole: AllowedRole.Faculty),
        new("F-B29-FOOTBALL", "Community Center - Football Pitch", FacilityType.SportsCourt, allowedRole: AllowedRole.Faculty),
        new("F-B29-FOOT6", "Community Center - Six-a-side Pitch", FacilityType.SportsCourt, allowedRole: AllowedRole.Faculty),
        new("F-B29-FOOT5-1", "Community Center - Five-a-side Pitch 1", FacilityType.SportsCourt, allowedRole: AllowedRole.Faculty),
        new("F-B29-FOOT5-2", "Community Center - Five-a-side Pitch 2", FacilityType.SportsCourt, allowedRole: AllowedRole.Faculty),
        new("F-B29-BASKETBALL", "Community Center - Basketball Court", FacilityType.SportsCourt, allowedRole: AllowedRole.Faculty),
        new("F-B29-TENNIS-1", "Community Center - Tennis Court 1", FacilityType.SportsCourt, allowedRole: AllowedRole.Faculty),
        new("F-B29-TENNIS-2", "Community Center - Tennis Court 2", FacilityType.SportsCourt, allowedRole: AllowedRole.Faculty),
        new("F-B29-TENNIS-3", "Community Center - Tennis Court 3", FacilityType.SportsCourt, allowedRole: AllowedRole.Faculty),
        new("F-B29-BOWLING", "Community Center - Bowling Hall", FacilityType.Other, allowedRole: AllowedRole.Faculty),
        new("F-B29-CINEMA", "Community Center - Cinema", FacilityType.Other, allowedRole: AllowedRole.Faculty),
        new("F-B29-MAIN-HALL", "Community Center - Main Hall", FacilityType.Other, allowedRole: AllowedRole.Faculty),
        new("F-B29-BANQUET", "Community Center - Banquet Hall", FacilityType.Other, allowedRole: AllowedRole.Faculty),
        new("F-ABHA-HALL", "Abha Hall", FacilityType.Other, allowedRole: AllowedRole.Faculty),
        new("F-QATIF-HALL", "Qatif Hall", FacilityType.Other, allowedRole: AllowedRole.Faculty),

        // Auditoriums and event halls
        new("F-B10-AUD", "B10 - Auditorium", FacilityType.Other),
        new("F-B42-AUD", "B42 - Auditorium", FacilityType.Other),
        new("F-B54-HALL", "B54 - Multi-purpose Hall", FacilityType.Other),
        new("F-B60-AUD", "B60 - Auditorium", FacilityType.Other),
        new("F-B70-AUD", "B70 - Auditorium", FacilityType.Other),

        // Libraries
        new("F-B8-LIBRARY", "B8 - Main Library", FacilityType.Other),
        new("F-B19-440", "B19 - CDBE Resource Center (Room 440)", FacilityType.Other),
        new("F-B58-LIBRARY", "B58 - PYP Library", FacilityType.Other),
    ];

    /// <summary>
    /// Adds any facility that is missing, so an existing database picks up new ones. Inserts the
    /// sample user, reservation and participant only if the database has no users yet. Safe to
    /// call repeatedly.
    /// </summary>
    public static async Task SeedAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        var existing = await context.Facilities.Select(f => f.FacilityId).ToListAsync(cancellationToken);
        context.AddRange(Facilities().Where(f => !existing.Contains(f.FacilityId)));
        await context.SaveChangesAsync(cancellationToken);

        if (await context.Users.AnyAsync(cancellationToken))
            return;

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
            facilityId: "F-B22-124",
            userId: user.KfupmId,
            status: ReservationStatus.Confirmed);

        var participant = new EventParticipant(
            userId: user.KfupmId,
            reservationId: reservation.ReservationId);

        context.AddRange(user, reservation, participant);
        await context.SaveChangesAsync(cancellationToken);
    }
}
