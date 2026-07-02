using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResourceManager.Api.Models;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Data.Configurations;

public class ReservationConfiguration : IEntityTypeConfiguration<Reservation>
{
    public void Configure(EntityTypeBuilder<Reservation> builder)
    {
        builder.ToTable("Reservations");
        builder.HasKey(r => r.Id);

        builder.HasIndex(r => r.ReservationId).IsUnique();
        builder.Property(r => r.ReservationId).IsRequired().HasMaxLength(30);

        builder.HasIndex(r => new { r.FacilityId, r.StartTime, r.EndTime}).IsUnique();

        builder.Property(r => r.Reason).IsRequired().HasMaxLength(500);

        builder.Property(r => r.Status).HasConversion<string>().HasMaxLength(20);
        
        builder.HasOne(r => r.Facility)
            .WithMany(f => f.Reservations)
            .HasForeignKey(r => r.FacilityId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.User)
            .WithMany(u => u.Reservations)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
