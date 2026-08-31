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
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }

    public override int SaveChanges()
    {
        StampTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void StampTimestamps()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var entry in ChangeTracker.Entries<EntityBase>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Property(nameof(EntityBase.CreatedAt)).CurrentValue = now;
                    entry.Entity.Touch(now);
                    break;
                case EntityState.Modified:
                    entry.Entity.Touch(now);
                    break;
            }
        }
    }
}
