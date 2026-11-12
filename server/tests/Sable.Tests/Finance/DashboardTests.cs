using System.Net;
using Sable.Tests.Auth;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Finance;

[Collection(ApiCollection.Name)]
public class DashboardTests(ApiFactory factory)
{
    private readonly ApiClient _api = new(factory);

    [Fact]
    public async Task Dashboard_without_data_is_all_zeros()
    {
        var user = await _api.RegisterAsync();

        var dashboard = await user.Client.GetDashboardAsync();

        var thisMonth = FinanceClientExtensions.Today.ToString("yyyy-MM");
        Assert.Equal(thisMonth, dashboard.Month);
        Assert.Equal(0m, dashboard.TotalBalance);
        Assert.Equal(0m, dashboard.Income);
        Assert.Equal(0m, dashboard.Expense);
        Assert.Equal(0, dashboard.SavedPercent);
        Assert.Equal(0m, dashboard.Previous.TotalBalance);
        Assert.Equal(0, dashboard.Previous.SavedPercent);
        Assert.Equal(6, dashboard.Monthly.Count);
        Assert.Equal(thisMonth, dashboard.Monthly[^1].Month);
        Assert.All(dashboard.Monthly, m => Assert.Equal((0m, 0m), (m.Income, m.Expense)));
        Assert.Empty(dashboard.ByCategory);
        Assert.Empty(dashboard.Recent);
    }

    [Fact]
    public async Task Dashboard_values_match_the_transactions_of_the_month_and_the_previous_one()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync("Картка", initialBalance: 1000);
        var food = await user.Client.GetSystemCategoryAsync("Продукти");
        var rent = await user.Client.GetSystemCategoryAsync("Житло");
        var salary = await user.Client.GetSystemCategoryAsync("Зарплата");

        await user.Client.CreateTransactionAsync(account.Id, salary.Id, 400, "Income", new DateOnly(2026, 4, 10));
        await user.Client.CreateTransactionAsync(account.Id, salary.Id, 2000, "Income", new DateOnly(2026, 5, 31));
        await user.Client.CreateTransactionAsync(account.Id, food.Id, 500, "Expense", new DateOnly(2026, 5, 1));
        await user.Client.CreateTransactionAsync(account.Id, salary.Id, 3000, "Income", new DateOnly(2026, 6, 1));
        await user.Client.CreateTransactionAsync(account.Id, food.Id, 200, "Expense", new DateOnly(2026, 6, 15));
        await user.Client.CreateTransactionAsync(account.Id, rent.Id, 1000, "Expense", new DateOnly(2026, 6, 30));
        await user.Client.CreateTransactionAsync(account.Id, salary.Id, 100, "Income", new DateOnly(2026, 7, 1));

        var dashboard = await user.Client.GetDashboardAsync("2026-06");

        Assert.Equal("2026-06", dashboard.Month);
        Assert.Equal(3000m, dashboard.Income);
        Assert.Equal(1200m, dashboard.Expense);
        Assert.Equal(60, dashboard.SavedPercent);
        Assert.Equal(1000m + 400m + 2000m - 500m + 3000m - 1200m, dashboard.TotalBalance);
        Assert.Equal(2000m, dashboard.Previous.Income);
        Assert.Equal(500m, dashboard.Previous.Expense);
        Assert.Equal(75, dashboard.Previous.SavedPercent);
        Assert.Equal(1000m + 400m + 2000m - 500m, dashboard.Previous.TotalBalance);

        Assert.Equal(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"], dashboard.Monthly.Select(m => m.Month));
        Assert.Equal(400m, dashboard.Monthly[3].Income);
        Assert.Equal(0m, dashboard.Monthly[3].Expense);
        Assert.Equal((2000m, 500m), (dashboard.Monthly[4].Income, dashboard.Monthly[4].Expense));
        Assert.Equal((3000m, 1200m), (dashboard.Monthly[5].Income, dashboard.Monthly[5].Expense));
        Assert.Equal((0m, 0m), (dashboard.Monthly[0].Income, dashboard.Monthly[0].Expense));

        Assert.Equal(["Житло", "Продукти"], dashboard.ByCategory.Select(c => c.Name));
        Assert.Equal([1000m, 200m], dashboard.ByCategory.Select(c => c.Amount));

        Assert.Equal(5, dashboard.Recent.Count);
        Assert.Equal(new DateOnly(2026, 7, 1), dashboard.Recent[0].OccurredOn);
        Assert.Equal(new DateOnly(2026, 6, 30), dashboard.Recent[1].OccurredOn);
    }

    [Fact]
    public async Task Saved_percent_can_be_negative_and_is_rounded_away_from_zero()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var food = await user.Client.GetSystemCategoryAsync("Продукти");
        var salary = await user.Client.GetSystemCategoryAsync("Зарплата");
        await user.Client.CreateTransactionAsync(account.Id, salary.Id, 1000, "Income", new DateOnly(2026, 3, 1));
        await user.Client.CreateTransactionAsync(account.Id, food.Id, 1500, "Expense", new DateOnly(2026, 3, 2));
        await user.Client.CreateTransactionAsync(account.Id, salary.Id, 8, "Income", new DateOnly(2026, 2, 1));
        await user.Client.CreateTransactionAsync(account.Id, food.Id, 1, "Expense", new DateOnly(2026, 2, 2));

        var march = await user.Client.GetDashboardAsync("2026-03");
        var february = await user.Client.GetDashboardAsync("2026-02");

        Assert.Equal(-50, march.SavedPercent);
        Assert.Equal(88, february.SavedPercent);
    }

    [Fact]
    public async Task Six_expense_categories_are_folded_into_four_and_an_other_row()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var names = new[] { "Житло", "Продукти", "Транспорт", "Розваги", "Зв’язок", "Комунальні" };
        var amounts = new[] { 600m, 500m, 400m, 300m, 200m, 100m };
        for (var i = 0; i < names.Length; i++)
        {
            var category = await user.Client.GetSystemCategoryAsync(names[i]);
            await user.Client.CreateTransactionAsync(account.Id, category.Id, amounts[i], "Expense", new DateOnly(2026, 6, 10));
        }

        var dashboard = await user.Client.GetDashboardAsync("2026-06");

        Assert.Equal(5, dashboard.ByCategory.Count);
        Assert.Equal(["Житло", "Продукти", "Транспорт", "Розваги", "Інше"], dashboard.ByCategory.Select(c => c.Name));
        var other = dashboard.ByCategory[^1];
        Assert.Equal(300m, other.Amount);
        Assert.Equal(Guid.Empty, other.CategoryId);
        Assert.Equal("#A0A1A8", other.Color);
    }

    [Fact]
    public async Task Exactly_four_expense_categories_have_no_other_row()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        foreach (var name in new[] { "Житло", "Продукти", "Транспорт", "Розваги" })
        {
            var category = await user.Client.GetSystemCategoryAsync(name);
            await user.Client.CreateTransactionAsync(account.Id, category.Id, 10, "Expense", new DateOnly(2026, 6, 10));
        }

        var dashboard = await user.Client.GetDashboardAsync("2026-06");

        Assert.Equal(4, dashboard.ByCategory.Count);
        Assert.DoesNotContain(dashboard.ByCategory, c => c.Name == "Інше");
    }

    [Fact]
    public async Task Dashboard_only_counts_the_data_of_the_current_user()
    {
        var owner = await _api.RegisterAsync();
        var stranger = await _api.RegisterAsync();
        var account = await owner.Client.CreateAccountAsync(initialBalance: 500);
        var category = await owner.Client.GetSystemCategoryAsync("Продукти");
        await owner.Client.CreateTransactionAsync(account.Id, category.Id, 50, "Expense", new DateOnly(2026, 6, 10));

        var dashboard = await stranger.Client.GetDashboardAsync("2026-06");

        Assert.Equal(0m, dashboard.TotalBalance);
        Assert.Equal(0m, dashboard.Expense);
        Assert.Empty(dashboard.Recent);
    }

    [Theory]
    [InlineData("2026-13")]
    [InlineData("2026-00")]
    [InlineData("abc")]
    [InlineData("2026-6")]
    [InlineData("2026/06")]
    public async Task Invalid_month_is_rejected(string month)
    {
        var user = await _api.RegisterAsync();

        var response = await user.Client.GetAsync($"/api/dashboard?month={Uri.EscapeDataString(month)}");

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "month");
    }
}
