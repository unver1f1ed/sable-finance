using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sable.Domain.Entities;

namespace Sable.Infrastructure.Finance.Configurations;

public class GoalConfiguration : IEntityTypeConfiguration<Goal>
{
    public void Configure(EntityTypeBuilder<Goal> builder)
    {
        builder.ToTable(t => t.HasCheckConstraint("ck_goals_target_amount_positive", "target_amount > 0"));

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedNever();
        builder.Property(e => e.Name).HasMaxLength(60).IsRequired();
        builder.Property(e => e.TargetAmount).HasPrecision(18, 2);
        builder.Property(e => e.Icon).HasMaxLength(30).IsRequired();
        builder.Property(e => e.Color).HasMaxLength(7).IsRequired();
        builder.HasIndex(e => e.UserId);
    }
}
