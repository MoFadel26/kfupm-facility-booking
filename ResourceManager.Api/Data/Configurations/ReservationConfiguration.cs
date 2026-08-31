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

        // Overlap is enforced by the "EX_Reservations_NoOverlap" exclusion constraint,
        // added by raw SQL in the AddReservationOverlapExclusionConstraint migration.
        // Its GiST index also serves the overlap lookup in ReservationService.

        builder.Property(r => r.Reason).IsRequired().HasMaxLength(500);

        builder.Property(r => r.Status).HasConversion<string>().HasMaxLength(20);

        builder.Property(r => r.FacilityId).IsRequired().HasMaxLength(20);
        builder.Property(r => r.UserId).IsRequired().HasMaxLength(20);

        builder.HasOne(r => r.Facility)
            .WithMany(f => f.Reservations)
            .HasForeignKey(r => r.FacilityId)
            .HasPrincipalKey(f => f.FacilityId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.User)
            .WithMany(u => u.Reservations)
            .HasForeignKey(r => r.UserId)
            .HasPrincipalKey(u => u.KfupmId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
