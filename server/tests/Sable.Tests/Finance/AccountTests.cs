using System.Net;
using Sable.Tests.Auth;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Finance;

[Collection(ApiCollection.Name)]
public class AccountTests(ApiFactory factory)
{
    private readonly ApiClient _api = new(factory);

    [Fact]
    public async Task First_account_is_default_even_when_not_requested()
    {
        var user = await _api.RegisterAsync();

        var account = await user.Client.CreateAccountAsync("Картка", isDefault: false);

        Assert.True(account.IsDefault);
    }

    [Fact]
    public async Task Second_default_account_replaces_the_first_one()
    {
        var user = await _api.RegisterAsync();
        await user.Client.CreateAccountAsync("Перший");

        var second = await user.Client.CreateAccountAsync("Другий", isDefault: true);

        var accounts = await user.Client.GetAccountsAsync();
        Assert.Single(accounts, a => a.IsDefault);
        Assert.Equal(second.Id, accounts[0].Id);
        Assert.True(accounts[0].IsDefault);
    }

    [Fact]
    public async Task Accounts_are_listed_with_default_first_and_then_by_name()
    {
        var user = await _api.RegisterAsync(planCode: "plus");
        await user.Client.CreateAccountAsync("Б");
        await user.Client.CreateAccountAsync("А");
        await user.Client.CreateAccountAsync("Я", isDefault: true);

        var names = (await user.Client.GetAccountsAsync()).Select(a => a.Name);

        Assert.Equal(["Я", "А", "Б"], names);
    }

    [Fact]
    public async Task Third_account_on_start_plan_is_rejected()
    {
        var user = await _api.RegisterAsync(planCode: "start");
        await user.Client.CreateAccountAsync("Один");
        await user.Client.CreateAccountAsync("Два");

        var response = await user.Client.PostJsonAsync("/api/accounts",
            new { name = "Три", type = "Cash", initialBalance = 0, isDefault = false });

        await response.AssertProblemAsync(HttpStatusCode.Forbidden, "plan_limit");
    }

    [Fact]
    public async Task Third_account_on_plus_plan_is_allowed()
    {
        var user = await _api.RegisterAsync(planCode: "plus");
        await user.Client.CreateAccountAsync("Один");
        await user.Client.CreateAccountAsync("Два");

        var third = await user.Client.CreateAccountAsync("Три");

        Assert.Equal("Три", third.Name);
    }

    [Fact]
    public async Task Duplicate_name_in_another_letter_case_is_a_conflict()
    {
        var user = await _api.RegisterAsync();
        await user.Client.CreateAccountAsync("Картка");

        var response = await user.Client.PostJsonAsync("/api/accounts",
            new { name = "  КАРТКА ", type = "Card", initialBalance = 0, isDefault = false });

        await response.AssertProblemAsync(HttpStatusCode.Conflict, "conflict");
    }

    [Fact]
    public async Task Different_users_may_use_the_same_account_name()
    {
        var first = await _api.RegisterAsync();
        var second = await _api.RegisterAsync();

        await first.Client.CreateAccountAsync("Картка");
        var account = await second.Client.CreateAccountAsync("Картка");

        Assert.Equal("Картка", account.Name);
    }

    [Fact]
    public async Task Balance_and_transaction_count_are_computed_from_transactions()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync("Картка", initialBalance: 100);
        var expense = await user.Client.GetSystemCategoryAsync("Продукти");
        var income = await user.Client.GetSystemCategoryAsync("Зарплата");
        await user.Client.CreateTransactionAsync(account.Id, income.Id, 50, "Income");
        await user.Client.CreateTransactionAsync(account.Id, expense.Id, 30, "Expense");
        await user.Client.CreateTransactionAsync(account.Id, expense.Id, 0.5m, "Expense");

        var listed = (await user.Client.GetAccountsAsync()).Single();

        Assert.Equal(100m, listed.InitialBalance);
        Assert.Equal(119.5m, listed.Balance);
        Assert.Equal(3, listed.TransactionCount);
    }

    [Fact]
    public async Task Update_changes_fields_and_keeps_the_only_default_account_default()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync("Картка", initialBalance: 10);

        var response = await user.Client.PutJsonAsync($"/api/accounts/{account.Id}",
            new { name = "Готівка", type = "Cash", initialBalance = 25.5, isDefault = false });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.ReadAsync<Sable.Application.Accounts.AccountDto>();
        Assert.Equal("Готівка", updated.Name);
        Assert.Equal(Sable.Domain.Enums.AccountType.Cash, updated.Type);
        Assert.Equal(25.5m, updated.InitialBalance);
        Assert.True(updated.IsDefault);
    }

    [Fact]
    public async Task Update_can_move_the_default_flag_to_another_account()
    {
        var user = await _api.RegisterAsync();
        var first = await user.Client.CreateAccountAsync("Перший");
        var second = await user.Client.CreateAccountAsync("Другий");

        var response = await user.Client.PutJsonAsync($"/api/accounts/{second.Id}",
            new { name = "Другий", type = "Card", initialBalance = 0, isDefault = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var accounts = await user.Client.GetAccountsAsync();
        Assert.Equal(second.Id, Assert.Single(accounts, a => a.IsDefault).Id);
        Assert.NotEqual(first.Id, accounts.Single(a => a.IsDefault).Id);
    }

    [Fact]
    public async Task Update_of_a_missing_or_foreign_account_returns_not_found()
    {
        var owner = await _api.RegisterAsync();
        var stranger = await _api.RegisterAsync();
        var account = await owner.Client.CreateAccountAsync();

        var response = await stranger.Client.PutJsonAsync($"/api/accounts/{account.Id}",
            new { name = "Чужий", type = "Card", initialBalance = 0, isDefault = false });

        await response.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
    }

    [Fact]
    public async Task Account_with_transactions_cannot_be_deleted()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var category = await user.Client.GetSystemCategoryAsync("Продукти");
        await user.Client.CreateTransactionAsync(account.Id, category.Id);

        var response = await user.Client.DeleteAsync($"/api/accounts/{account.Id}");

        await response.AssertProblemAsync(HttpStatusCode.Conflict, "conflict");
    }

    [Fact]
    public async Task Deleting_the_default_account_makes_the_oldest_remaining_one_default()
    {
        var user = await _api.RegisterAsync(planCode: "plus");
        var oldest = await user.Client.CreateAccountAsync("Найстаріший");
        await user.Client.CreateAccountAsync("Середній");
        var newest = await user.Client.CreateAccountAsync("Найновіший", isDefault: true);

        var response = await user.Client.DeleteAsync($"/api/accounts/{newest.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var accounts = await user.Client.GetAccountsAsync();
        Assert.Equal(2, accounts.Count);
        Assert.Equal(oldest.Id, Assert.Single(accounts, a => a.IsDefault).Id);
    }

    [Fact]
    public async Task Deleting_a_missing_account_returns_not_found()
    {
        var user = await _api.RegisterAsync();

        var response = await user.Client.DeleteAsync($"/api/accounts/{Guid.NewGuid()}");

        await response.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
    }

    [Theory]
    [InlineData("", 0, "name")]
    [InlineData("   ", 0, "name")]
    [InlineData("Картка", 2_000_000_000, "initialBalance")]
    [InlineData("Картка", -1_000_000_001, "initialBalance")]
    [InlineData("Картка", 1.234, "initialBalance")]
    public async Task Invalid_input_returns_validation_error_for_the_field(string name, double balance, string field)
    {
        var user = await _api.RegisterAsync();

        var response = await user.Client.PostJsonAsync("/api/accounts",
            new { name, type = "Card", initialBalance = balance, isDefault = false });

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", field);
    }

    [Fact]
    public async Task Too_long_name_and_unknown_type_are_rejected()
    {
        var user = await _api.RegisterAsync();

        var longName = await user.Client.PostJsonAsync("/api/accounts",
            new { name = new string('а', 61), type = "Card", initialBalance = 0, isDefault = false });
        var unknownType = await user.Client.PostJsonAsync("/api/accounts",
            new { name = "Картка", type = "Crypto", initialBalance = 0, isDefault = false });

        await longName.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "name");
        await unknownType.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed");
    }

    [Fact]
    public async Task Accounts_require_authentication()
    {
        var response = await _api.Anonymous().GetAsync("/api/accounts");

        await response.AssertProblemAsync(HttpStatusCode.Unauthorized, "unauthorized");
    }
}
