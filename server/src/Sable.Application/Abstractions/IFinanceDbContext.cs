using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Sable.Domain.Entities;

namespace Sable.Application.Abstractions;

public interface IFinanceDbContext
{
    DbSet<Account> Accounts { get; }
    DbSet<Category> Categories { get; }
    DbSet<Transaction> Transactions { get; }
    DbSet<Budget> Budgets { get; }
    DbSet<Goal> Goals { get; }
    DbSet<Plan> Plans { get; }
    DbSet<PlanFeature> PlanFeatures { get; }
    DbSet<PlanFeatureValue> PlanFeatureValues { get; }
    DbSet<Review> Reviews { get; }
    DbSet<FaqTopic> FaqTopics { get; }
    DbSet<FaqItem> FaqItems { get; }
    DbSet<ContactMessage> ContactMessages { get; }

    DatabaseFacade Database { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
