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

        builder.HasOne(ep => ep.User)
            .WithMany(u => u.EventParticipants)
            .HasForeignKey(ep => ep.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(ep => ep.Reservation)
            .WithMany(r => r.EventParticipants)
            .HasForeignKey(ep => ep.ReservationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
