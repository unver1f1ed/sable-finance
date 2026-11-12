using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sable.Domain.Entities;

namespace Sable.Infrastructure.Finance.Configurations;

public class PlanFeatureValueConfiguration : IEntityTypeConfiguration<PlanFeatureValue>
{
    public void Configure(EntityTypeBuilder<PlanFeatureValue> builder)
    {
        builder.HasKey(e => new { e.PlanId, e.FeatureId });
        builder.Property(e => e.Kind).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(e => e.Text).HasMaxLength(40);

        builder.HasOne(e => e.Plan).WithMany(p => p.FeatureValues)
            .HasForeignKey(e => e.PlanId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(e => e.Feature).WithMany(f => f.Values)
            .HasForeignKey(e => e.FeatureId).OnDelete(DeleteBehavior.Cascade);
    }
}
