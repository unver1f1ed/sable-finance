using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sable.Domain.Entities;

namespace Sable.Infrastructure.Finance.Configurations;

public class FaqTopicConfiguration : IEntityTypeConfiguration<FaqTopic>
{
    public void Configure(EntityTypeBuilder<FaqTopic> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedNever();
        builder.Property(e => e.Name).HasMaxLength(60).IsRequired();
        builder.HasIndex(e => e.Name).IsUnique();
    }
}
