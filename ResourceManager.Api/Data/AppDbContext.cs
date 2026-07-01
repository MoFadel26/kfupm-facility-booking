using Microsoft.EntityFrameworkCore;
using ResourceManager.Api.Models;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Data;

public class AppDbContext : DbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Facility> Facilities => Set<Facility>();
    public DbSet<Reservation> Reservations => Set<Reservation>();
    public DbSet<EventParticipant> EventParticipants => Set<EventParticipant>();

    public AppDbContext(DbContextOptions options) : base(options) { }
    
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        base.OnConfiguring(optionsBuilder);

        optionsBuilder.UseSeeding((context, _) =>
        {
            if (!context.Set<User>().Any())
            {
                SeedData(context);
                context.SaveChanges();
            }
        });

        optionsBuilder.UseAsyncSeeding(async (context, _, cancellationToken) =>
        {
            if (!await context.Set<User>().AnyAsync(cancellationToken))
            {
                SeedData(context);
                await context.SaveChangesAsync(cancellationToken);
            }
        });
    }

    private static void SeedData(DbContext context)
    {
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
            facilityId: facility.Id,
            userId: user.Id,
            status: ReservationStatus.Confirmed);

        var participant = new EventParticipant(
            userId: user.Id,
            reservationId: reservation.Id);

        context.AddRange(facility, user, reservation, participant);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
