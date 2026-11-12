using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Sable.Infrastructure.Identity.Configurations;

public class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> builder)
    {
        builder.Property(e => e.FirstName).HasMaxLength(60).IsRequired();
        builder.Property(e => e.LastName).HasMaxLength(60).IsRequired();
        builder.Property(e => e.PlanCode).HasMaxLength(20).IsRequired().HasDefaultValue("start");
    }
}
