using System.Diagnostics;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
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
    IConfiguration configuration,
    IHostEnvironment environment,
    TimeProvider timeProvider,
    ILogger<DatabaseInitializer> logger)
{
    public async Task InitializeAsync()
    {
        var stopwatch = Stopwatch.StartNew();

        await identityDb.Database.MigrateAsync();
        await financeDb.Database.MigrateAsync();
        await SeedAsync();

        logger.LogInformation("Database migrations and seeding took {ElapsedMs} ms", stopwatch.ElapsedMilliseconds);
    }

    private async Task SeedAsync()
    {
        await SeedRolesAsync();
        await SeedAdminAsync();
        await SeedSystemCategoriesAsync();
        await SeedContentAsync();
        await SeedDemoAsync();
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

    /// <summary>Creates the demo user with six months of data in Development or when <c>Seed:Demo</c> is true.</summary>
    private async Task SeedDemoAsync()
    {
        if (!environment.IsDevelopment() && !configuration.GetValue<bool>("Seed:Demo"))
        {
            return;
        }

        var password = configuration["Seed:DemoPassword"];
        if (string.IsNullOrEmpty(password))
        {
            logger.LogWarning("Demo data is enabled but Seed:DemoPassword is not set; the demo user was not created.");
            return;
        }

        var user = await users.FindByEmailAsync(DemoData.Email);
        if (user is null)
        {
            user = new AppUser
            {
                Id = Guid.CreateVersion7(),
                UserName = DemoData.Email,
                Email = DemoData.Email,
                FirstName = DemoData.FirstName,
                LastName = DemoData.LastName,
                PlanCode = "plus",
                CreatedAt = timeProvider.GetUtcNow()
            };
            EnsureSucceeded(await users.CreateAsync(user, password), "create the demo user");
            EnsureSucceeded(await users.AddToRoleAsync(user, Roles.User), "assign the demo user role");
        }

        // The seeder has no current user, so the per-user query filter would hide the demo rows.
        if (await financeDb.Accounts.IgnoreQueryFilters().AnyAsync(a => a.UserId == user.Id))
        {
            return;
        }

        var categories = await financeDb.Categories
            .Where(c => c.UserId == null && DemoData.RequiredCategories.Contains(c.Name))
            .ToDictionaryAsync(c => c.Name, c => c.Id);
        var missing = DemoData.RequiredCategories.Where(name => !categories.ContainsKey(name)).ToList();
        if (missing.Count > 0)
        {
            throw new InvalidOperationException($"Demo seed needs system categories that are missing: {string.Join(", ", missing)}");
        }

        var now = timeProvider.GetUtcNow();
        var data = DemoData.Generate(user.Id, DateOnly.FromDateTime(now.UtcDateTime), now, categories);
        financeDb.Accounts.AddRange(data.Accounts);
        financeDb.Goals.AddRange(data.Goals);
        financeDb.Budgets.AddRange(data.Budgets);
        financeDb.Transactions.AddRange(data.Transactions);
        await financeDb.SaveChangesAsync();
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
