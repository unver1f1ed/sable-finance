using System.Net;
using Sable.Application.Budgets;
using Sable.Tests.Auth;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Finance;

[Collection(ApiCollection.Name)]
public class BudgetTests(ApiFactory factory)
{
    private readonly ApiClient _api = new(factory);

    private static DateOnly Today => FinanceClientExtensions.Today;

    [Fact]
    public async Task Create_returns_the_budget_with_zero_spent_and_the_summary_lists_it()
    {
        var user = await _api.RegisterAsync();
        var food = await user.Client.GetSystemCategoryAsync("Продукти");

        var budget = await user.Client.CreateBudgetAsync(food.Id, 5000);

        Assert.Equal(5000m, budget.LimitAmount);
        Assert.Equal(0m, budget.Spent);
        Assert.Equal(Today.ToString("yyyy-MM"), budget.Month);
        Assert.Equal("Продукти", budget.Category.Name);

        var summary = await user.Client.GetBudgetsAsync();
        Assert.Equal(budget.Id, Assert.Single(summary.Items).Id);
    }

    [Fact]
    public async Task Spent_counts_only_expenses_of_the_category_inside_the_month()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var food = await user.Client.GetSystemCategoryAsync("Продукти");
        var rent = await user.Client.GetSystemCategoryAsync("Житло");
        var salary = await user.Client.GetSystemCategoryAsync("Зарплата");
        await user.Client.CreateBudgetAsync(food.Id, 1000);
        await user.Client.CreateTransactionAsync(account.Id, food.Id, 100, "Expense", new DateOnly(2026, 6, 1));
        await user.Client.CreateTransactionAsync(account.Id, food.Id, 50.5m, "Expense", new DateOnly(2026, 6, 30));
        await user.Client.CreateTransactionAsync(account.Id, food.Id, 999, "Expense", new DateOnly(2026, 5, 31));
        await user.Client.CreateTransactionAsync(account.Id, food.Id, 999, "Expense", new DateOnly(2026, 7, 1));
        await user.Client.CreateTransactionAsync(account.Id, rent.Id, 777, "Expense", new DateOnly(2026, 6, 10));
        await user.Client.CreateTransactionAsync(account.Id, salary.Id, 888, "Income", new DateOnly(2026, 6, 10));

        var june = await user.Client.GetBudgetsAsync("2026-06");
        var may = await user.Client.GetBudgetsAsync("2026-05");
        var august = await user.Client.GetBudgetsAsync("2026-08");

        Assert.Equal("2026-06", june.Month);
        Assert.Equal(150.5m, june.Items.Single().Spent);
        Assert.Equal("2026-06", june.Items.Single().Month);
        Assert.Equal(999m, may.Items.Single().Spent);
        Assert.Equal(0m, august.Items.Single().Spent);
    }

    [Fact]
    public async Task Summary_for_the_current_month_computes_totals_days_left_and_per_day_amount()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var food = await user.Client.GetSystemCategoryAsync("Продукти");
        var rent = await user.Client.GetSystemCategoryAsync("Житло");
        await user.Client.CreateBudgetAsync(food.Id, 3000);
        await user.Client.CreateBudgetAsync(rent.Id, 7000);
        await user.Client.CreateTransactionAsync(account.Id, food.Id, 1000, "Expense", new DateOnly(Today.Year, Today.Month, 1));
        await user.Client.CreateTransactionAsync(account.Id, rent.Id, 2000, "Expense", new DateOnly(Today.Year, Today.Month, 1));

        var summary = await user.Client.GetBudgetsAsync();

        var daysLeft = DateTime.DaysInMonth(Today.Year, Today.Month) - Today.Day + 1;
        Assert.Equal(10000m, summary.TotalLimit);
        Assert.Equal(3000m, summary.TotalSpent);
        Assert.Equal(daysLeft, summary.DaysLeft);
        Assert.Equal(Math.Round(7000m / daysLeft, 0, MidpointRounding.AwayFromZero), summary.PerDayLeft);
        Assert.Equal(["Житло", "Продукти"], summary.Items.Select(i => i.Category.Name));
    }

    [Fact]
    public async Task Past_month_has_no_days_left_and_per_day_equals_the_remaining_amount()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var food = await user.Client.GetSystemCategoryAsync("Продукти");
        await user.Client.CreateBudgetAsync(food.Id, 1000);
        await user.Client.CreateTransactionAsync(account.Id, food.Id, 250, "Expense", new DateOnly(2026, 1, 15));

        var summary = await user.Client.GetBudgetsAsync("2026-01");

        Assert.Equal(0, summary.DaysLeft);
        Assert.Equal(750m, summary.PerDayLeft);
    }

    [Fact]
    public async Task Future_month_has_all_days_of_that_month_left()
    {
        var user = await _api.RegisterAsync();
        var food = await user.Client.GetSystemCategoryAsync("Продукти");
        await user.Client.CreateBudgetAsync(food.Id, 3100);
        var future = new DateOnly(Today.Year, Today.Month, 1).AddMonths(2);

        var summary = await user.Client.GetBudgetsAsync(future.ToString("yyyy-MM"));

        var days = DateTime.DaysInMonth(future.Year, future.Month);
        Assert.Equal(days, summary.DaysLeft);
        Assert.Equal(Math.Round(3100m / days, 0, MidpointRounding.AwayFromZero), summary.PerDayLeft);
    }

    [Fact]
    public async Task Overspent_budget_gives_zero_per_day()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var food = await user.Client.GetSystemCategoryAsync("Продукти");
        await user.Client.CreateBudgetAsync(food.Id, 100);
        await user.Client.CreateTransactionAsync(account.Id, food.Id, 500, "Expense", new DateOnly(2026, 1, 15));

        var summary = await user.Client.GetBudgetsAsync("2026-01");

        Assert.Equal(0m, summary.PerDayLeft);
        Assert.Equal(500m, summary.TotalSpent);
    }

    [Fact]
    public async Task Empty_summary_has_zero_totals()
    {
        var user = await _api.RegisterAsync();

        var summary = await user.Client.GetBudgetsAsync();

        Assert.Empty(summary.Items);
        Assert.Equal(0m, summary.TotalLimit);
        Assert.Equal(0m, summary.PerDayLeft);
    }

    [Fact]
    public async Task Sixth_budget_on_the_start_plan_is_rejected_but_allowed_on_plus()
    {
        var start = await _api.RegisterAsync(planCode: "start");
        var plus = await _api.RegisterAsync(planCode: "plus");

        foreach (var user in new[] { start, plus })
        {
            for (var i = 0; i < 5; i++)
            {
                var category = await user.Client.CreateCategoryAsync($"Категорія {i}");
                await user.Client.CreateBudgetAsync(category.Id, 100);
            }
        }

        var sixthStart = await start.Client.CreateCategoryAsync("Шоста");
        var sixthPlus = await plus.Client.CreateCategoryAsync("Шоста");

        var rejected = await start.Client.PostJsonAsync("/api/budgets", new { categoryId = sixthStart.Id, limitAmount = 100 });
        var allowed = await plus.Client.PostJsonAsync("/api/budgets", new { categoryId = sixthPlus.Id, limitAmount = 100 });

        await rejected.AssertProblemAsync(HttpStatusCode.Forbidden, "plan_limit");
        Assert.Equal(HttpStatusCode.Created, allowed.StatusCode);
    }

    [Fact]
    public async Task Second_budget_for_the_same_category_is_a_conflict()
    {
        var user = await _api.RegisterAsync();
        var food = await user.Client.GetSystemCategoryAsync("Продукти");
        await user.Client.CreateBudgetAsync(food.Id, 100);

        var response = await user.Client.PostJsonAsync("/api/budgets", new { categoryId = food.Id, limitAmount = 200 });

        await response.AssertProblemAsync(HttpStatusCode.Conflict, "conflict");
    }

    [Fact]
    public async Task Income_and_goal_contribution_categories_cannot_have_a_budget()
    {
        var user = await _api.RegisterAsync();
        var income = await user.Client.GetSystemCategoryAsync("Зарплата");
        var contribution = await user.Client.GetSystemCategoryAsync("Внесок у ціль");

        var incomeResponse = await user.Client.PostJsonAsync("/api/budgets", new { categoryId = income.Id, limitAmount = 100 });
        var contributionResponse = await user.Client.PostJsonAsync("/api/budgets", new { categoryId = contribution.Id, limitAmount = 100 });
        var unknown = await user.Client.PostJsonAsync("/api/budgets", new { categoryId = Guid.NewGuid(), limitAmount = 100 });

        await incomeResponse.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "categoryId");
        await contributionResponse.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "categoryId");
        await unknown.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "categoryId");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(1_000_000_001)]
    [InlineData(10.123)]
    public async Task Invalid_limit_is_rejected(double limit)
    {
        var user = await _api.RegisterAsync();
        var food = await user.Client.GetSystemCategoryAsync("Продукти");

        var response = await user.Client.PostJsonAsync("/api/budgets", new { categoryId = food.Id, limitAmount = limit });

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "limitAmount");
    }

    [Fact]
    public async Task Update_changes_the_limit_and_delete_removes_the_budget()
    {
        var user = await _api.RegisterAsync();
        var food = await user.Client.GetSystemCategoryAsync("Продукти");
        var budget = await user.Client.CreateBudgetAsync(food.Id, 100);

        var update = await user.Client.PutJsonAsync($"/api/budgets/{budget.Id}", new { limitAmount = 250.5 });
        var delete = await user.Client.DeleteAsync($"/api/budgets/{budget.Id}");

        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        Assert.Equal(250.5m, (await update.ReadAsync<BudgetDto>()).LimitAmount);
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Empty((await user.Client.GetBudgetsAsync()).Items);
    }

    [Fact]
    public async Task Budget_of_another_user_is_not_found()
    {
        var owner = await _api.RegisterAsync();
        var stranger = await _api.RegisterAsync();
        var food = await owner.Client.GetSystemCategoryAsync("Продукти");
        var budget = await owner.Client.CreateBudgetAsync(food.Id, 100);

        var update = await stranger.Client.PutJsonAsync($"/api/budgets/{budget.Id}", new { limitAmount = 1 });
        var delete = await stranger.Client.DeleteAsync($"/api/budgets/{budget.Id}");

        await update.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
        await delete.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
        Assert.Empty((await stranger.Client.GetBudgetsAsync()).Items);
        Assert.Equal(100m, (await owner.Client.GetBudgetsAsync()).Items.Single().LimitAmount);
    }

    [Theory]
    [InlineData("2026-13")]
    [InlineData("abc")]
    [InlineData("2026-6")]
    public async Task Invalid_month_is_rejected(string month)
    {
        var user = await _api.RegisterAsync();

        var response = await user.Client.GetAsync($"/api/budgets?month={Uri.EscapeDataString(month)}");

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "month");
    }

    [Fact]
    public async Task Budget_endpoints_require_authentication()
    {
        var response = await _api.Anonymous().GetAsync("/api/budgets");

        await response.AssertProblemAsync(HttpStatusCode.Unauthorized, "unauthorized");
    }
}
