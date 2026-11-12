using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sable.Domain.Entities;

namespace Sable.Infrastructure.Finance.Configurations;

public class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ToTable(t => t.HasCheckConstraint("ck_transactions_amount_positive", "amount > 0"));

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedNever();
        builder.Property(e => e.Type).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(e => e.Amount).HasPrecision(18, 2);
        builder.Property(e => e.Description).HasMaxLength(120).IsRequired();
        builder.Property(e => e.Note).HasMaxLength(300);

        builder.HasOne(e => e.Account).WithMany(a => a.Transactions)
            .HasForeignKey(e => e.AccountId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Category).WithMany(c => c.Transactions)
            .HasForeignKey(e => e.CategoryId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Goal).WithMany(g => g.Transactions)
            .HasForeignKey(e => e.GoalId).OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(e => new { e.UserId, e.OccurredOn }).IsDescending(false, true);
        builder.HasIndex(e => new { e.UserId, e.CategoryId });
        builder.HasIndex(e => new { e.UserId, e.AccountId });
        builder.HasIndex(e => e.GoalId);
    }
}
