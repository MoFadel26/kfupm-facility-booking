using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResourceManager.Api.Models;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        builder.HasKey(x => x.Id);

        builder.HasIndex(x => x.KfupmId).IsUnique();
        builder.Property(x => x.KfupmId).IsRequired().HasMaxLength(20);

        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);

        builder.HasIndex(x => x.Email).IsUnique();
        builder.Property(x => x.Email).IsRequired().HasMaxLength(150);

        builder.Property(x => x.Role).HasConversion<string>();
        builder.Property(x => x.Gender).HasConversion<string>();
    }
}
