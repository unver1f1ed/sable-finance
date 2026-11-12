using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Sable.Application.Auth;
using Sable.Domain.Entities;
using Sable.Infrastructure.Finance;
using Sable.Infrastructure.Finance.Seed;
using Sable.Infrastructure.Identity;

namespace Sable.Infrastructure;

public class DatabaseInitializer(
    IdentityDbContext identityDb,
    FinanceDbContext financeDb,
    RoleManager<IdentityRole<Guid>> roles,
    UserManager<AppUser> users,
    IConfiguration configuration)
{
    public async Task InitializeAsync()
    {
        await identityDb.Database.MigrateAsync();
        await financeDb.Database.MigrateAsync();
        await SeedAsync();
    }

    private async Task SeedAsync()
    {
        await SeedRolesAsync();
        await SeedAdminAsync();
        await SeedSystemCategoriesAsync();
        await SeedContentAsync();
    }

    private async Task SeedRolesAsync()
    {
        foreach (var name in new[] { Roles.User, Roles.Admin })
        {
            if (await roles.RoleExistsAsync(name))
            {
                continue;
            }

            var created = await roles.CreateAsync(new IdentityRole<Guid>(name) { Id = Guid.CreateVersion7() });
            EnsureSucceeded(created, $"create role '{name}'");
        }
    }

    private async Task SeedAdminAsync()
    {
        var email = configuration["Seed:AdminEmail"]?.Trim().ToLowerInvariant();
        var password = configuration["Seed:AdminPassword"];
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
        {
            return;
        }

        if (await users.FindByEmailAsync(email) is not null)
        {
            return;
        }

        var admin = new AppUser
        {
            Id = Guid.CreateVersion7(),
            UserName = email,
            Email = email,
            FirstName = "Адміністратор",
            LastName = "Sable",
            PlanCode = "plus",
            CreatedAt = DateTimeOffset.UtcNow
        };

        EnsureSucceeded(await users.CreateAsync(admin, password), "create the admin user");
        EnsureSucceeded(await users.AddToRolesAsync(admin, [Roles.Admin, Roles.User]), "assign admin roles");
    }

    private async Task SeedSystemCategoriesAsync()
    {
        foreach (var item in SystemCategories.All)
        {
            var exists = await financeDb.Categories
                .AnyAsync(c => c.UserId == null && c.Name == item.Name && c.Type == item.Type);
            if (exists)
            {
                continue;
            }

            financeDb.Categories.Add(new Category
            {
                Id = Guid.CreateVersion7(),
                UserId = null,
                Name = item.Name,
                Type = item.Type,
                Icon = item.Icon,
                Color = item.Color,
                IsGoalContribution = item.IsGoalContribution
            });
        }

        await financeDb.SaveChangesAsync();
    }

    /// <summary>Inserts public content only where it is missing, so edits made by an admin survive restarts.</summary>
    private async Task SeedContentAsync()
    {
        foreach (var item in PlanSeed.Plans)
        {
            if (await financeDb.Plans.AnyAsync(p => p.Code == item.Code))
            {
                continue;
            }

            financeDb.Plans.Add(new Plan
            {
                Id = Guid.CreateVersion7(),
                Code = item.Code,
                Name = item.Name,
                Description = item.Description,
                PriceMonthly = item.PriceMonthly,
                PriceYearlyPerMonth = item.PriceYearlyPerMonth,
                IsPopular = item.IsPopular,
                IsPublished = true,
                SortOrder = item.SortOrder
            });
        }

        await financeDb.SaveChangesAsync();

        if (!await financeDb.PlanFeatures.AnyAsync())
        {
            var planIds = await financeDb.Plans.ToDictionaryAsync(p => p.Code, p => p.Id);
            var order = 1;
            foreach (var definition in PlanSeed.Features)
            {
                var feature = new PlanFeature { Id = Guid.CreateVersion7(), Name = definition.Name, SortOrder = order++ };
                AddFeatureValue(feature, planIds, "start", definition.Start);
                AddFeatureValue(feature, planIds, "plus", definition.Plus);
                financeDb.PlanFeatures.Add(feature);
            }

            await financeDb.SaveChangesAsync();
        }

        if (!await financeDb.Reviews.AnyAsync())
        {
            var now = DateTimeOffset.UtcNow;
            for (var i = 0; i < ReviewSeed.Reviews.Length; i++)
            {
                var review = ReviewSeed.Reviews[i];
                financeDb.Reviews.Add(new Review
                {
                    Id = Guid.CreateVersion7(),
                    Author = review.Author,
                    Text = review.Text,
                    Rating = review.Rating,
                    IsPublished = true,
                    CreatedAt = now.AddDays(-i)
                });
            }

            await financeDb.SaveChangesAsync();
        }

        if (!await financeDb.FaqTopics.AnyAsync())
        {
            var now = DateTimeOffset.UtcNow;
            var topicOrder = 1;
            foreach (var topicDefinition in FaqSeed.Topics)
            {
                var topic = new FaqTopic { Id = Guid.CreateVersion7(), Name = topicDefinition.Name, SortOrder = topicOrder++ };
                var itemOrder = 1;
                foreach (var itemDefinition in topicDefinition.Items)
                {
                    topic.Items.Add(new FaqItem
                    {
                        Id = Guid.CreateVersion7(),
                        Question = itemDefinition.Question,
                        Answer = itemDefinition.Answer,
                        IsPublished = true,
                        SortOrder = itemOrder++,
                        UpdatedAt = now
                    });
                }

                financeDb.FaqTopics.Add(topic);
            }

            await financeDb.SaveChangesAsync();
        }
    }

    private static void AddFeatureValue(
        PlanFeature feature,
        Dictionary<string, Guid> planIds,
        string planCode,
        PlanSeed.FeatureValue value)
    {
        if (planIds.TryGetValue(planCode, out var planId))
        {
            feature.Values.Add(new PlanFeatureValue { PlanId = planId, Kind = value.Kind, Text = value.Text });
        }
    }

    private static void EnsureSucceeded(IdentityResult result, string action)
    {
        if (!result.Succeeded)
        {
            var details = string.Join("; ", result.Errors.Select(e => e.Code));
            throw new InvalidOperationException($"Seeding failed to {action}: {details}");
        }
    }
}
