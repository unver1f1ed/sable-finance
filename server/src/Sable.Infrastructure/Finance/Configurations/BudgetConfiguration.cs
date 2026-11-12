using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sable.Domain.Entities;

namespace Sable.Infrastructure.Finance.Configurations;

public class BudgetConfiguration : IEntityTypeConfiguration<Budget>
{
    public void Configure(EntityTypeBuilder<Budget> builder)
    {
        builder.ToTable(t => t.HasCheckConstraint("ck_budgets_limit_amount_positive", "limit_amount > 0"));

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedNever();
        builder.Property(e => e.LimitAmount).HasPrecision(18, 2);

        builder.HasOne(e => e.Category).WithMany(c => c.Budgets)
            .HasForeignKey(e => e.CategoryId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.UserId, e.CategoryId }).IsUnique();
    }
}
