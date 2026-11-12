using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sable.Domain.Entities;

namespace Sable.Infrastructure.Finance.Configurations;

public class FaqItemConfiguration : IEntityTypeConfiguration<FaqItem>
{
    public void Configure(EntityTypeBuilder<FaqItem> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedNever();
        builder.Property(e => e.Question).HasMaxLength(160).IsRequired();
        builder.Property(e => e.Answer).HasMaxLength(600).IsRequired();

        builder.HasOne(e => e.Topic).WithMany(t => t.Items)
            .HasForeignKey(e => e.TopicId).OnDelete(DeleteBehavior.Restrict);
    }
}
