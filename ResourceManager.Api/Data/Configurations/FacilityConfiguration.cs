using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResourceManager.Api.Models;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Data.Configurations;

public class FacilityConfiguration : IEntityTypeConfiguration<Facility>
{
    public void Configure(EntityTypeBuilder<Facility> builder)
    {
        builder.ToTable("Facilities");
        builder.HasKey(f => f.Id);

        builder.HasIndex(f => f.FacilityId).IsUnique();
        builder.Property(f => f.FacilityId).IsRequired().HasMaxLength(20);

        builder.Property(f => f.Name).IsRequired().HasMaxLength(50);

        builder.Property(f => f.Type).HasConversion<string>().HasMaxLength(20);
        builder.Property(f => f.AllowedGender).HasConversion<string>().HasMaxLength(10);
        builder.Property(f=> f.AllowedRole).HasConversion<string>().HasMaxLength(15);
    }
}
