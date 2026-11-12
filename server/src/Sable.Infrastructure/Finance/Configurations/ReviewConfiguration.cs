using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sable.Domain.Entities;

namespace Sable.Infrastructure.Finance.Configurations;

public class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.ToTable(t => t.HasCheckConstraint("ck_reviews_rating_range", "rating between 1 and 5"));

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedNever();
        builder.Property(e => e.Author).HasMaxLength(60).IsRequired();
        builder.Property(e => e.Text).HasMaxLength(280).IsRequired();
    }
}
