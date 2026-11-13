using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Sable.Infrastructure;
using Sable.Infrastructure.Finance;
using Sable.Tests.Auth;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Finance;

[Collection(ApiCollection.Name)]
public class DemoDataTests(ApiFactory factory)
{
    private readonly ApiClient _api = new(factory);

    private async Task<RegisteredUser> LoginAsDemoAsync()
    {
        using var warmUp = factory.CreateClient();
        return await _api.LoginUserAsync(ApiFactory.DemoEmail, ApiFactory.DemoPassword);
    }

    [Fact]
    public async Task Demo_user_has_consistent_data_for_the_dashboard_budgets_and_goals()
    {
        var demo = await LoginAsDemoAsync();
        Assert.Equal("plus", demo.Auth.User.PlanCode);
        Assert.Equal(["User"], demo.Auth.User.Roles);

        var accounts = await demo.Client.GetAccountsAsync();
        Assert.Equal(["Картка Monobank", "Готівка", "Заощадження"], accounts.OrderByDescending(a => a.IsDefault).ThenBy(a => a.Name == "Готівка" ? 0 : 1).Select(a => a.Name));
        Assert.All(accounts, a => Assert.True(a.Balance >= 0, $"{a.Name} has a negative balance {a.Balance}"));
        Assert.Equal(1, accounts.Count(a => a.IsDefault));

        var dashboard = await demo.Client.GetDashboardAsync();
        Assert.True(dashboard.TotalBalance > 0);
        Assert.Equal(6, dashboard.Monthly.Count);
        Assert.All(dashboard.Monthly.Take(5), m => Assert.True(m.Income > 0 && m.Expense > 0));
        Assert.NotEmpty(dashboard.ByCategory);
        Assert.Equal(5, dashboard.Recent.Count);

        var budgets = await demo.Client.GetBudgetsAsync();
        Assert.Equal(5, budgets.Items.Count);
        var cafes = budgets.Items.Single(b => b.Category.Name == "Кафе й ресторани");
        Assert.True(cafes.Spent > cafes.LimitAmount, "the café budget should be over its limit");
        Assert.True(cafes.Spent < cafes.LimitAmount + 500, "the café budget should exceed its limit only slightly");

        var goals = await demo.Client.GetGoalsAsync(includeArchived: true);
        Assert.Equal(4, goals.Count);
        Assert.Equal(1, goals.Count(g => g.IsArchived));
        var laptop = goals.Single(g => g.Name == "Новий ноутбук");
        Assert.True(laptop.IsAchieved);
        Assert.Equal(38_000m, laptop.CurrentAmount);
        Assert.Equal(27_000m, goals.Single(g => g.Name == "Відпустка в Карпатах").CurrentAmount);
        Assert.Equal(62_000m, goals.Single(g => g.Name == "Фінансова подушка").CurrentAmount);
        Assert.NotNull(goals.Single(g => g.Name == "Відпустка в Карпатах").Deadline);
    }

    [Fact]
    public async Task Demo_transactions_cover_six_months_and_none_lies_in_the_future()
    {
        var demo = await LoginAsDemoAsync();

        var all = await demo.Client.GetTransactionsAsync("?pageSize=50&sort=date_asc");
        var newest = await demo.Client.GetTransactionsAsync("?pageSize=10");

        Assert.InRange(all.Total, 150, 320);
        Assert.True(newest.Items[0].OccurredOn <= FinanceClientExtensions.Today);
        Assert.True(all.Items[0].OccurredOn <= new DateOnly(FinanceClientExtensions.Today.Year, FinanceClientExtensions.Today.Month, 1).AddMonths(-4));
        Assert.Contains("Зарплата, ТОВ «Софтлайн»", (await demo.Client.GetTransactionsAsync("?search=%D0%A1%D0%BE%D1%84%D1%82%D0%BB%D0%B0%D0%B9%D0%BD")).Items.Select(t => t.Description));
        Assert.True(all.TotalIncome >= 5 * 46_000m);
    }

    [Fact]
    public async Task Running_the_initializer_again_does_not_duplicate_the_demo_data()
    {
        var demo = await LoginAsDemoAsync();
        var before = (await demo.Client.GetTransactionsAsync()).Total;

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            await scope.ServiceProvider.GetRequiredService<DatabaseInitializer>().InitializeAsync();
        }

        Assert.Equal(before, (await demo.Client.GetTransactionsAsync()).Total);
        Assert.Equal(3, (await demo.Client.GetAccountsAsync()).Count);
        Assert.Equal(4, (await demo.Client.GetGoalsAsync(includeArchived: true)).Count);
        Assert.Equal(5, (await demo.Client.GetBudgetsAsync()).Items.Count);

        await using var check = factory.Services.CreateAsyncScope();
        var db = check.ServiceProvider.GetRequiredService<FinanceDbContext>();
        var userId = demo.Auth.User.Id;
        Assert.Equal(before, await db.Transactions.IgnoreQueryFilters().CountAsync(t => t.UserId == userId));
        Assert.True(await db.Transactions.IgnoreQueryFilters().Where(t => t.UserId == userId).MaxAsync(t => t.OccurredOn) <= FinanceClientExtensions.Today);
    }
}
