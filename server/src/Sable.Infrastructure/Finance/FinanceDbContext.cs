using Microsoft.EntityFrameworkCore;
using Sable.Application.Abstractions;
using Sable.Domain.Entities;

namespace Sable.Infrastructure.Finance;

public class FinanceDbContext(DbContextOptions<FinanceDbContext> options, ICurrentUser currentUser)
    : DbContext(options), IFinanceDbContext
{
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<PlanFeature> PlanFeatures => Set<PlanFeature>();
    public DbSet<PlanFeatureValue> PlanFeatureValues => Set<PlanFeatureValue>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<FaqTopic> FaqTopics => Set<FaqTopic>();
    public DbSet<FaqItem> FaqItems => Set<FaqItem>();
    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(FinanceDbContext).Assembly,
            t => t.Namespace!.StartsWith("Sable.Infrastructure.Finance", StringComparison.Ordinal));

        modelBuilder.Entity<Account>().HasQueryFilter(e => e.UserId == currentUser.UserId);
        modelBuilder.Entity<Transaction>().HasQueryFilter(e => e.UserId == currentUser.UserId);
        modelBuilder.Entity<Budget>().HasQueryFilter(e => e.UserId == currentUser.UserId);
        modelBuilder.Entity<Goal>().HasQueryFilter(e => e.UserId == currentUser.UserId);
        modelBuilder.Entity<Category>().HasQueryFilter(e => e.UserId == null || e.UserId == currentUser.UserId);
    }
}
