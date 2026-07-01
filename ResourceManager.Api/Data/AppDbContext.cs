using Microsoft.EntityFrameworkCore;
using ResourceManager.Api.Models;

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
        var facility = new Facility();
        var fEntry = context.Add(facility);
        fEntry.Property(f => f.FacilityId).CurrentValue = "F-B22-124";
        fEntry.Property(f => f.Name).CurrentValue = "B22 - Room 124";
        fEntry.Property(f => f.Type).CurrentValue = Models.Enums.FacilityType.Classroom;
        fEntry.Property(f => f.AllowedGender).CurrentValue = Models.Enums.AllowedGender.Any;
        fEntry.Property(f => f.AllowedRole).CurrentValue = Models.Enums.AllowedRole.Any;

        var user = new User();
        var uEntry = context.Add(user);
        uEntry.Property(u => u.KfupmId).CurrentValue = "202300001";
        uEntry.Property(u => u.Name).CurrentValue = "Ahmed Al-Fadel";
        uEntry.Property(u => u.Email).CurrentValue = "s202300001@kfupm.edu.sa";
        uEntry.Property(u => u.Role).CurrentValue = Models.Enums.UserRole.Student;
        uEntry.Property(u => u.Gender).CurrentValue = Models.Enums.Gender.Male;

        var reservation = new Reservation();
        var rEntry = context.Add(reservation);
        rEntry.Property(r => r.ReservationId).CurrentValue = "RES-1001";
        rEntry.Property(r => r.StartTime).CurrentValue = DateTimeOffset.UtcNow.AddDays(1);
        rEntry.Property(r => r.EndTime).CurrentValue = DateTimeOffset.UtcNow.AddDays(1).AddHours(2);
        rEntry.Property(r => r.Reason).CurrentValue = "Project Meeting";
        rEntry.Property(r => r.Status).CurrentValue = Models.Enums.ReservationStatus.Confirmed;
        rEntry.Property(r => r.TargetParticipantCount).CurrentValue = 4;
        rEntry.Property(r => r.FacilityId).CurrentValue = "F-B22-124";
        rEntry.Property(r => r.KfupmId).CurrentValue = "202300001";

        var participant = new EventParticipant();
        var pEntry = context.Add(participant);
        pEntry.Property(p => p.KfupmId).CurrentValue = "202300001";
        pEntry.Property(p => p.ReservationId).CurrentValue = "RES-1001";
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
