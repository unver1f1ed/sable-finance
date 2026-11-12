using System.Net;
using Sable.Application.Goals;
using Sable.Tests.Auth;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Finance;

[Collection(ApiCollection.Name)]
public class GoalTests(ApiFactory factory)
{
    private readonly ApiClient _api = new(factory);

    private static DateOnly Today => FinanceClientExtensions.Today;

    [Fact]
    public async Task Create_returns_a_goal_without_progress_and_without_monthly_amount()
    {
        var user = await _api.RegisterAsync();

        var goal = await user.Client.CreateGoalAsync("Ноутбук", 25000);

        Assert.Equal("Ноутбук", goal.Name);
        Assert.Equal(25000m, goal.TargetAmount);
        Assert.Equal(0m, goal.CurrentAmount);
        Assert.False(goal.IsAchieved);
        Assert.False(goal.IsArchived);
        Assert.Null(goal.Deadline);
        Assert.Null(goal.MonthlyNeeded);
    }

    [Fact]
    public async Task Monthly_needed_divides_the_remaining_amount_by_whole_months_and_rounds_up()
    {
        var user = await _api.RegisterAsync(planCode: "plus");
        var deadline = Today.AddMonths(5);
        var months = deadline.Day >= Today.Day ? 5 : 4;

        var exact = await user.Client.CreateGoalAsync("Рівно", 10000, deadline);
        var rounded = await user.Client.CreateGoalAsync("Округлення", 10001, deadline);

        Assert.Equal((long)Math.Ceiling(10000m / months), exact.MonthlyNeeded);
        Assert.Equal((long)Math.Ceiling(10001m / months), rounded.MonthlyNeeded);
        if (months == 5)
        {
            Assert.Equal(2000, exact.MonthlyNeeded);
            Assert.Equal(2001, rounded.MonthlyNeeded);
        }
    }

    [Fact]
    public async Task Monthly_needed_is_at_least_one_month_for_a_near_deadline()
    {
        var user = await _api.RegisterAsync();

        var goal = await user.Client.CreateGoalAsync("Скоро", 900, Today.AddDays(3));

        Assert.Equal(900, goal.MonthlyNeeded);
    }

    [Fact]
    public async Task Second_active_goal_on_start_is_rejected_until_the_first_is_archived()
    {
        var user = await _api.RegisterAsync(planCode: "start");
        var first = await user.Client.CreateGoalAsync("Перша");

        var rejected = await user.Client.PostJsonAsync("/api/goals", FinanceClientExtensions.GoalBody("Друга"));
        var archive = await user.Client.PostAsync($"/api/goals/{first.Id}/archive", null);
        var afterArchive = await user.Client.PostJsonAsync("/api/goals", FinanceClientExtensions.GoalBody("Друга"));

        await rejected.AssertProblemAsync(HttpStatusCode.Forbidden, "plan_limit");
        Assert.Equal(HttpStatusCode.OK, archive.StatusCode);
        Assert.Equal(HttpStatusCode.Created, afterArchive.StatusCode);
    }

    [Fact]
    public async Task Achieved_goal_does_not_count_toward_the_start_limit()
    {
        var user = await _api.RegisterAsync(planCode: "start");
        var account = await user.Client.CreateAccountAsync();
        var goal = await user.Client.CreateGoalAsync("Мала", 100);
        Assert.Equal(HttpStatusCode.Created, (await user.Client.ContributeAsync(goal.Id, account.Id, 100)).StatusCode);

        var second = await user.Client.PostJsonAsync("/api/goals", FinanceClientExtensions.GoalBody("Нова"));

        Assert.Equal(HttpStatusCode.Created, second.StatusCode);
    }

    [Fact]
    public async Task Plus_plan_has_no_goal_limit()
    {
        var user = await _api.RegisterAsync(planCode: "plus");

        for (var i = 0; i < 4; i++)
        {
            await user.Client.CreateGoalAsync($"Ціль {i}");
        }

        Assert.Equal(4, (await user.Client.GetGoalsAsync()).Count);
    }

    [Fact]
    public async Task List_orders_active_then_achieved_then_archived_and_hides_archived_by_default()
    {
        var user = await _api.RegisterAsync(planCode: "plus");
        var account = await user.Client.CreateAccountAsync();
        var archived = await user.Client.CreateGoalAsync("Архівна");
        var achieved = await user.Client.CreateGoalAsync("Досягнута", 50);
        var olderActive = await user.Client.CreateGoalAsync("Активна стара");
        var newerActive = await user.Client.CreateGoalAsync("Активна нова");
        await user.Client.ContributeAsync(achieved.Id, account.Id, 50);
        await user.Client.PostAsync($"/api/goals/{archived.Id}/archive", null);

        var visible = await user.Client.GetGoalsAsync();
        var all = await user.Client.GetGoalsAsync(includeArchived: true);

        Assert.Equal(["Активна нова", "Активна стара", "Досягнута"], visible.Select(g => g.Name));
        Assert.Equal(["Активна нова", "Активна стара", "Досягнута", "Архівна"], all.Select(g => g.Name));
        Assert.True(all[^1].IsArchived);
        Assert.True(all[2].IsAchieved);
        Assert.Equal(newerActive.Id, all[0].Id);
        Assert.Equal(olderActive.Id, all[1].Id);
    }

    [Fact]
    public async Task Update_changes_the_goal_and_may_lower_the_target_below_the_progress()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var goal = await user.Client.CreateGoalAsync("Мрія", 1000);
        await user.Client.ContributeAsync(goal.Id, account.Id, 400);

        var response = await user.Client.PutJsonAsync($"/api/goals/{goal.Id}",
            FinanceClientExtensions.GoalBody("Нова мрія", 300, Today.AddMonths(3)));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.ReadAsync<GoalDto>();
        Assert.Equal("Нова мрія", updated.Name);
        Assert.Equal(300m, updated.TargetAmount);
        Assert.Equal(400m, updated.CurrentAmount);
        Assert.True(updated.IsAchieved);
        Assert.Null(updated.MonthlyNeeded);
    }

    [Fact]
    public async Task Archived_goal_cannot_be_edited_and_archiving_twice_is_idempotent()
    {
        var user = await _api.RegisterAsync();
        var goal = await user.Client.CreateGoalAsync("Стара");
        var firstArchive = await user.Client.PostAsync($"/api/goals/{goal.Id}/archive", null);
        var secondArchive = await user.Client.PostAsync($"/api/goals/{goal.Id}/archive", null);

        var update = await user.Client.PutJsonAsync($"/api/goals/{goal.Id}", FinanceClientExtensions.GoalBody("Інша"));

        Assert.Equal(HttpStatusCode.OK, firstArchive.StatusCode);
        Assert.Equal(HttpStatusCode.OK, secondArchive.StatusCode);
        Assert.True((await secondArchive.ReadAsync<GoalDto>()).IsArchived);
        await update.AssertProblemAsync(HttpStatusCode.Conflict, "conflict");
    }

    [Fact]
    public async Task Archived_goal_has_no_monthly_needed()
    {
        var user = await _api.RegisterAsync();
        var goal = await user.Client.CreateGoalAsync("З датою", 1000, Today.AddMonths(4));
        Assert.NotNull(goal.MonthlyNeeded);

        var archived = await (await user.Client.PostAsync($"/api/goals/{goal.Id}/archive", null)).ReadAsync<GoalDto>();

        Assert.Null(archived.MonthlyNeeded);
    }

    [Fact]
    public async Task Goal_of_another_user_is_not_found_for_every_operation()
    {
        var owner = await _api.RegisterAsync();
        var stranger = await _api.RegisterAsync();
        var account = await stranger.Client.CreateAccountAsync();
        var goal = await owner.Client.CreateGoalAsync("Чужа");

        var put = await stranger.Client.PutJsonAsync($"/api/goals/{goal.Id}", FinanceClientExtensions.GoalBody());
        var delete = await stranger.Client.DeleteAsync($"/api/goals/{goal.Id}");
        var archive = await stranger.Client.PostAsync($"/api/goals/{goal.Id}/archive", null);
        var contribution = await stranger.Client.ContributeAsync(goal.Id, account.Id, 10);

        foreach (var response in new[] { put, delete, archive, contribution })
        {
            await response.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
        }

        Assert.Empty(await stranger.Client.GetGoalsAsync(includeArchived: true));
        Assert.Single(await owner.Client.GetGoalsAsync());
    }

    [Fact]
    public async Task Deadline_in_the_past_or_too_far_away_is_rejected()
    {
        var user = await _api.RegisterAsync(planCode: "plus");

        var past = await user.Client.PostJsonAsync("/api/goals", FinanceClientExtensions.GoalBody(deadline: Today.AddDays(-1)));
        var tooFar = await user.Client.PostJsonAsync("/api/goals", FinanceClientExtensions.GoalBody(deadline: Today.AddYears(51)));
        var todayOk = await user.Client.PostJsonAsync("/api/goals", FinanceClientExtensions.GoalBody(deadline: Today));

        await past.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "deadline");
        await tooFar.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "deadline");
        Assert.Equal(HttpStatusCode.Created, todayOk.StatusCode);
    }

    [Fact]
    public async Task Unchanged_past_deadline_is_accepted_on_update_but_a_new_past_deadline_is_not()
    {
        var user = await _api.RegisterAsync();
        var goal = await user.Client.CreateGoalAsync("Скоро", 100, Today);

        var sameDeadline = await user.Client.PutJsonAsync($"/api/goals/{goal.Id}",
            FinanceClientExtensions.GoalBody("Скоро 2", 100, Today));
        var newPast = await user.Client.PutJsonAsync($"/api/goals/{goal.Id}",
            FinanceClientExtensions.GoalBody("Скоро 2", 100, Today.AddDays(-5)));

        Assert.Equal(HttpStatusCode.OK, sameDeadline.StatusCode);
        await newPast.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "deadline");
    }

    [Theory]
    [InlineData("", 100, "target", "#6FDBD4", "name")]
    [InlineData("Ціль", 0, "target", "#6FDBD4", "targetAmount")]
    [InlineData("Ціль", 100.123, "target", "#6FDBD4", "targetAmount")]
    [InlineData("Ціль", 100, "nope", "#6FDBD4", "icon")]
    [InlineData("Ціль", 100, "target", "#000000", "color")]
    public async Task Invalid_input_is_rejected(string name, double target, string icon, string color, string field)
    {
        var user = await _api.RegisterAsync();

        var response = await user.Client.PostJsonAsync("/api/goals",
            new { name, targetAmount = target, icon, color });

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", field);
    }

    [Fact]
    public async Task Deleting_a_goal_keeps_its_transactions_and_clears_their_goal()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var goal = await user.Client.CreateGoalAsync("Тимчасова", 500);
        await user.Client.ContributeAsync(goal.Id, account.Id, 120);

        var delete = await user.Client.DeleteAsync($"/api/goals/{goal.Id}");

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        var transaction = Assert.Single((await user.Client.GetTransactionsAsync()).Items);
        Assert.Null(transaction.Goal);
        Assert.Equal(120m, transaction.Amount);
        Assert.Empty(await user.Client.GetGoalsAsync(includeArchived: true));
    }

    [Fact]
    public async Task Goal_endpoints_require_authentication()
    {
        var response = await _api.Anonymous().GetAsync("/api/goals");

        await response.AssertProblemAsync(HttpStatusCode.Unauthorized, "unauthorized");
    }
}
