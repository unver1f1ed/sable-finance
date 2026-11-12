using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sable.Domain.Entities;

namespace Sable.Infrastructure.Finance.Configurations;

public class PlanConfiguration : IEntityTypeConfiguration<Plan>
{
    public void Configure(EntityTypeBuilder<Plan> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedNever();
        builder.Property(e => e.Code).HasMaxLength(20).IsRequired();
        builder.Property(e => e.Name).HasMaxLength(60).IsRequired();
        builder.Property(e => e.Description).HasMaxLength(120).IsRequired();
        builder.Property(e => e.PriceMonthly).HasPrecision(18, 2);
        builder.Property(e => e.PriceYearlyPerMonth).HasPrecision(18, 2);
        builder.HasIndex(e => e.Code).IsUnique();
    }
}
