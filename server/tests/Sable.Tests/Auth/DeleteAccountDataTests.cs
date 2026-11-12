using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Sable.Domain.Entities;
using Sable.Domain.Enums;
using Sable.Infrastructure.Finance;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Auth;

[Collection(ApiCollection.Name)]
public class DeleteAccountDataTests(ApiFactory factory)
{
    private readonly ApiClient _api = new(factory);

    [Fact]
    public async Task Delete_account_erases_only_the_finance_data_of_that_user()
    {
        var doomed = await _api.RegisterAsync();
        var survivor = await _api.RegisterAsync();
        await SeedFinanceDataAsync(doomed.Auth.User.Id);
        await SeedFinanceDataAsync(survivor.Auth.User.Id);

        var response = await doomed.Client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/me")
        {
            Content = JsonContent.Create(new { password = doomed.Password })
        });

        response.EnsureSuccessStatusCode();
        Assert.Equal(0, await CountRowsAsync(doomed.Auth.User.Id));
        Assert.Equal(5, await CountRowsAsync(survivor.Auth.User.Id));
    }

    private async Task SeedFinanceDataAsync(Guid userId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FinanceDbContext>();

        var account = new Account { Id = Guid.CreateVersion7(), UserId = userId, Name = "Картка", Type = AccountType.Card };
        var category = new Category
        {
            Id = Guid.CreateVersion7(), UserId = userId, Name = "Власна", Type = TransactionType.Expense,
            Icon = "cart", Color = "#6FDBD4"
        };
        var goal = new Goal
        {
            Id = Guid.CreateVersion7(), UserId = userId, Name = "Відпустка", TargetAmount = 1000,
            Icon = "target", Color = "#6FDBD4"
        };
        var budget = new Budget { Id = Guid.CreateVersion7(), UserId = userId, Category = category, LimitAmount = 500 };
        var transaction = new Transaction
        {
            Id = Guid.CreateVersion7(), UserId = userId, Account = account, Category = category, Goal = goal,
            Type = TransactionType.Expense, Amount = 10, OccurredOn = new DateOnly(2026, 11, 1), Description = "Кава"
        };

        db.AddRange(account, category, goal, budget, transaction);
        await db.SaveChangesAsync();
    }

    private async Task<int> CountRowsAsync(Guid userId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FinanceDbContext>();

        return await db.Accounts.IgnoreQueryFilters().CountAsync(e => e.UserId == userId)
            + await db.Categories.IgnoreQueryFilters().CountAsync(e => e.UserId == userId)
            + await db.Goals.IgnoreQueryFilters().CountAsync(e => e.UserId == userId)
            + await db.Budgets.IgnoreQueryFilters().CountAsync(e => e.UserId == userId)
            + await db.Transactions.IgnoreQueryFilters().CountAsync(e => e.UserId == userId);
    }
}
