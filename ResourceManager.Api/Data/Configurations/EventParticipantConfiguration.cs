using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResourceManager.Api.Models;

namespace ResourceManager.Api.Data.Configurations;

public class EventParticipantConfiguration : IEntityTypeConfiguration<EventParticipant>
{
    public void Configure(EntityTypeBuilder<EventParticipant> builder)
    {
        builder.ToTable("EventParticipants");
        builder.HasKey(ep => ep.Id);

        builder.HasIndex(ep => new { ep.UserId, ep.ReservationId }).IsUnique();

        builder.Property(ep => ep.UserId).IsRequired().HasMaxLength(20);
        builder.Property(ep => ep.ReservationId).IsRequired().HasMaxLength(30);

        builder.HasOne(ep => ep.User)
            .WithMany(u => u.EventParticipants)
            .HasForeignKey(ep => ep.UserId)
            .HasPrincipalKey(u => u.KfupmId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(ep => ep.Reservation)
            .WithMany(r => r.EventParticipants)
            .HasForeignKey(ep => ep.ReservationId)
            .HasPrincipalKey(r => r.ReservationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
