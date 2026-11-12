using System.Net;
using Sable.Application.Goals;
using Sable.Application.Transactions;
using Sable.Domain.Enums;
using Sable.Tests.Auth;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Finance;

[Collection(ApiCollection.Name)]
public class GoalContributionTests(ApiFactory factory)
{
    private readonly ApiClient _api = new(factory);

    [Fact]
    public async Task Contribution_creates_an_expense_transaction_and_raises_the_goal_progress()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync("Картка", initialBalance: 1000);
        var goal = await user.Client.CreateGoalAsync("Відпустка", 5000);
        var contributionCategory = await user.Client.GetSystemCategoryAsync("Внесок у ціль");

        var response = await user.Client.ContributeAsync(goal.Id, account.Id, 750.25m);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var updated = await response.ReadAsync<GoalDto>();
        Assert.Equal(750.25m, updated.CurrentAmount);
        Assert.False(updated.IsAchieved);

        var transaction = Assert.Single((await user.Client.GetTransactionsAsync()).Items);
        Assert.Equal(TransactionType.Expense, transaction.Type);
        Assert.Equal(750.25m, transaction.Amount);
        Assert.Equal(contributionCategory.Id, transaction.Category.Id);
        Assert.Equal(new IdName(goal.Id, "Відпустка"), transaction.Goal);
        Assert.Equal("Внесок: Відпустка", transaction.Description);
        Assert.Null(transaction.Note);
        Assert.Equal(249.75m, (await user.Client.GetAccountsAsync()).Single().Balance);
    }

    [Fact]
    public async Task Long_goal_names_are_cut_in_the_contribution_description()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var goal = await user.Client.CreateGoalAsync(new string('ц', 60), 100);

        await user.Client.ContributeAsync(goal.Id, account.Id, 10);

        var description = Assert.Single((await user.Client.GetTransactionsAsync()).Items).Description;
        Assert.Equal("Внесок: " + new string('ц', 60), description);
        Assert.True(description.Length <= 120);
    }

    [Fact]
    public async Task Contribution_larger_than_the_remaining_amount_is_rejected_and_the_exact_remainder_achieves_the_goal()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var goal = await user.Client.CreateGoalAsync("Ціль", 1000, FinanceClientExtensions.Today.AddMonths(3));
        await user.Client.ContributeAsync(goal.Id, account.Id, 400);

        var tooMuch = await user.Client.ContributeAsync(goal.Id, account.Id, 600.01m);
        var exact = await user.Client.ContributeAsync(goal.Id, account.Id, 600);
        var afterAchieved = await user.Client.ContributeAsync(goal.Id, account.Id, 1);

        await tooMuch.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "amount");
        Assert.Equal(HttpStatusCode.Created, exact.StatusCode);
        var achieved = await exact.ReadAsync<GoalDto>();
        Assert.True(achieved.IsAchieved);
        Assert.Equal(1000m, achieved.CurrentAmount);
        Assert.Null(achieved.MonthlyNeeded);
        await afterAchieved.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "amount");
    }

    [Fact]
    public async Task Contribution_to_an_archived_goal_is_a_conflict()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var goal = await user.Client.CreateGoalAsync();
        await user.Client.PostAsync($"/api/goals/{goal.Id}/archive", null);

        var response = await user.Client.ContributeAsync(goal.Id, account.Id, 10);

        await response.AssertProblemAsync(HttpStatusCode.Conflict, "conflict");
        Assert.Empty((await user.Client.GetTransactionsAsync()).Items);
    }

    [Fact]
    public async Task Contribution_validates_account_amount_and_date()
    {
        var user = await _api.RegisterAsync();
        var stranger = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var foreignAccount = await stranger.Client.CreateAccountAsync();
        var goal = await user.Client.CreateGoalAsync();

        var foreign = await user.Client.ContributeAsync(goal.Id, foreignAccount.Id, 10);
        var zero = await user.Client.ContributeAsync(goal.Id, account.Id, 0);
        var oldDate = await user.Client.ContributeAsync(goal.Id, account.Id, 10, new DateOnly(1999, 1, 1));
        var future = await user.Client.ContributeAsync(goal.Id, account.Id, 10, FinanceClientExtensions.Today.AddDays(2));

        await foreign.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "accountId");
        await zero.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "amount");
        await oldDate.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "occurredOn");
        await future.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "occurredOn");
        Assert.Empty((await user.Client.GetTransactionsAsync()).Items);
    }

    [Fact]
    public async Task Deleting_the_contribution_transaction_lowers_the_goal_progress()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var goal = await user.Client.CreateGoalAsync("Ціль", 1000);
        await user.Client.ContributeAsync(goal.Id, account.Id, 300);
        await user.Client.ContributeAsync(goal.Id, account.Id, 200);
        var transaction = (await user.Client.GetTransactionsAsync("?sort=amount_desc")).Items[0];
        Assert.Equal(300m, transaction.Amount);

        var delete = await user.Client.DeleteAsync($"/api/transactions/{transaction.Id}");

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal(200m, (await user.Client.GetGoalsAsync()).Single().CurrentAmount);
    }

    [Fact]
    public async Task Editing_the_contribution_transaction_changes_the_goal_progress()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var goal = await user.Client.CreateGoalAsync("Ціль", 1000);
        await user.Client.ContributeAsync(goal.Id, account.Id, 300);
        var transaction = Assert.Single((await user.Client.GetTransactionsAsync()).Items);

        var update = await user.Client.PutJsonAsync($"/api/transactions/{transaction.Id}",
            FinanceClientExtensions.TransactionBody(
                account.Id, transaction.Category.Id, 450, "Expense", transaction.OccurredOn, transaction.Description,
                goalId: goal.Id));

        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        Assert.Equal(450m, (await user.Client.GetGoalsAsync()).Single().CurrentAmount);
    }

    [Fact]
    public async Task Contribution_counts_in_the_dashboard_expense_of_its_month()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var goal = await user.Client.CreateGoalAsync("Ціль", 1000);
        await user.Client.ContributeAsync(goal.Id, account.Id, 120, new DateOnly(2026, 6, 10));

        var june = await user.Client.GetDashboardAsync("2026-06");
        var july = await user.Client.GetDashboardAsync("2026-07");

        Assert.Equal(120m, june.Expense);
        Assert.Equal("Внесок у ціль", Assert.Single(june.ByCategory).Name);
        Assert.Equal(0m, july.Expense);
        Assert.Equal(-120m, june.TotalBalance);
    }

    [Fact]
    public async Task Contribution_is_listed_through_the_transaction_filters_by_category()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var goal = await user.Client.CreateGoalAsync();
        var category = await user.Client.GetSystemCategoryAsync("Внесок у ціль");
        await user.Client.ContributeAsync(goal.Id, account.Id, 25);

        var list = await user.Client.GetTransactionsAsync($"?categoryId={category.Id}");

        Assert.Equal(1, list.Total);
        Assert.Equal(25m, list.TotalExpense);
    }
}
