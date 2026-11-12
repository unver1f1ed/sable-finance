using System.Net;
using Sable.Application.Transactions;
using Sable.Domain.Enums;
using Sable.Tests.Auth;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Finance;

[Collection(ApiCollection.Name)]
public class TransactionCrudTests(ApiFactory factory)
{
    private readonly ApiClient _api = new(factory);

    [Fact]
    public async Task Create_returns_the_transaction_with_nested_account_and_category()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync("Картка");
        var category = await user.Client.GetSystemCategoryAsync("Продукти");
        var body = FinanceClientExtensions.TransactionBody(
            account.Id, category.Id, 123.45m, description: "  Сільпо ", note: " до борщу ", date: new DateOnly(2026, 11, 5));

        var response = await user.Client.PostJsonAsync("/api/transactions", body);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.ReadAsync<TransactionDto>();
        Assert.Equal(TransactionType.Expense, created.Type);
        Assert.Equal(123.45m, created.Amount);
        Assert.Equal(new DateOnly(2026, 11, 5), created.OccurredOn);
        Assert.Equal("Сільпо", created.Description);
        Assert.Equal("до борщу", created.Note);
        Assert.Equal(new IdName(account.Id, "Картка"), created.Account);
        Assert.Equal(new CategoryRef(category.Id, "Продукти", category.Icon, category.Color), created.Category);
        Assert.Null(created.Goal);

        var fetched = await (await user.Client.GetAsync($"/api/transactions/{created.Id}")).ReadAsync<TransactionDto>();
        Assert.Equal(created, fetched);
    }

    [Fact]
    public async Task Response_uses_the_contract_field_names_and_enum_strings()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var category = await user.Client.GetSystemCategoryAsync("Зарплата");
        var created = await user.Client.CreateTransactionAsync(account.Id, category.Id, 5, "Income", new DateOnly(2026, 1, 2));

        var json = await (await user.Client.GetAsync($"/api/transactions/{created.Id}")).ReadJsonAsync();

        Assert.Equal("Income", json.GetProperty("type").GetString());
        Assert.Equal("2026-01-02", json.GetProperty("occurredOn").GetString());
        Assert.Equal(System.Text.Json.JsonValueKind.Null, json.GetProperty("note").ValueKind);
        Assert.Equal(System.Text.Json.JsonValueKind.Null, json.GetProperty("goal").ValueKind);
        Assert.Equal(account.Name, json.GetProperty("account").GetProperty("name").GetString());
    }

    [Fact]
    public async Task Blank_note_is_stored_as_null()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var category = await user.Client.GetSystemCategoryAsync("Продукти");

        var created = await user.Client.CreateTransactionAsync(account.Id, category.Id, note: "   ");

        Assert.Null(created.Note);
    }

    [Fact]
    public async Task Update_changes_the_fields_and_delete_removes_the_transaction()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync("Картка");
        var other = await user.Client.CreateAccountAsync("Готівка");
        var expense = await user.Client.GetSystemCategoryAsync("Продукти");
        var income = await user.Client.GetSystemCategoryAsync("Зарплата");
        var created = await user.Client.CreateTransactionAsync(account.Id, expense.Id, 10);

        var body = FinanceClientExtensions.TransactionBody(
            other.Id, income.Id, 99.99m, "Income", new DateOnly(2026, 3, 4), "Аванс", "за березень");
        var update = await user.Client.PutJsonAsync($"/api/transactions/{created.Id}", body);

        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var updated = await update.ReadAsync<TransactionDto>();
        Assert.Equal(created.Id, updated.Id);
        Assert.Equal(TransactionType.Income, updated.Type);
        Assert.Equal(99.99m, updated.Amount);
        Assert.Equal("Аванс", updated.Description);
        Assert.Equal("Готівка", updated.Account.Name);
        Assert.Equal("Зарплата", updated.Category.Name);

        var delete = await user.Client.DeleteAsync($"/api/transactions/{created.Id}");
        var afterDelete = await user.Client.GetAsync($"/api/transactions/{created.Id}");

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        await afterDelete.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
    }

    [Fact]
    public async Task Invalid_values_are_rejected_with_the_field_in_errors()
    {
        var user = await _api.RegisterAsync();
        var stranger = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var foreignAccount = await stranger.Client.CreateAccountAsync();
        var expense = await user.Client.GetSystemCategoryAsync("Продукти");
        var income = await user.Client.GetSystemCategoryAsync("Зарплата");
        var goalContribution = await user.Client.GetSystemCategoryAsync("Внесок у ціль");
        var ownCategory = await user.Client.CreateCategoryAsync("Власна");
        var foreignCategory = await stranger.Client.CreateCategoryAsync("Чужа");
        var today = FinanceClientExtensions.Today;

        var cases = new (string Field, object Body)[]
        {
            ("amount", FinanceClientExtensions.TransactionBody(account.Id, expense.Id, amount: 0)),
            ("amount", FinanceClientExtensions.TransactionBody(account.Id, expense.Id, amount: -5)),
            ("amount", FinanceClientExtensions.TransactionBody(account.Id, expense.Id, amount: 1.234m)),
            ("amount", FinanceClientExtensions.TransactionBody(account.Id, expense.Id, amount: 1_000_000_000.01m)),
            ("description", FinanceClientExtensions.TransactionBody(account.Id, expense.Id, description: "")),
            ("description", FinanceClientExtensions.TransactionBody(account.Id, expense.Id, description: new string('а', 121))),
            ("note", FinanceClientExtensions.TransactionBody(account.Id, expense.Id, note: new string('а', 301))),
            ("occurredOn", FinanceClientExtensions.TransactionBody(account.Id, expense.Id, date: new DateOnly(1999, 12, 31))),
            ("occurredOn", FinanceClientExtensions.TransactionBody(account.Id, expense.Id, date: today.AddDays(2))),
            ("accountId", FinanceClientExtensions.TransactionBody(foreignAccount.Id, expense.Id)),
            ("accountId", FinanceClientExtensions.TransactionBody(Guid.NewGuid(), expense.Id)),
            ("categoryId", FinanceClientExtensions.TransactionBody(account.Id, foreignCategory.Id)),
            ("categoryId", FinanceClientExtensions.TransactionBody(account.Id, Guid.NewGuid())),
            ("categoryId", FinanceClientExtensions.TransactionBody(account.Id, income.Id, type: "Expense")),
            ("categoryId", FinanceClientExtensions.TransactionBody(account.Id, ownCategory.Id, type: "Income")),
            ("goalId", FinanceClientExtensions.TransactionBody(account.Id, expense.Id, goalId: Guid.NewGuid())),
            ("goalId", FinanceClientExtensions.TransactionBody(account.Id, goalContribution.Id, goalId: Guid.NewGuid()))
        };

        foreach (var (field, body) in cases)
        {
            var response = await user.Client.PostJsonAsync("/api/transactions", body);
            await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", field);
        }

        Assert.Empty((await user.Client.GetTransactionsAsync()).Items);
    }

    [Fact]
    public async Task Tomorrow_and_the_year_2000_boundary_are_accepted()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var category = await user.Client.GetSystemCategoryAsync("Продукти");

        var tomorrow = await user.Client.CreateTransactionAsync(
            account.Id, category.Id, date: FinanceClientExtensions.Today.AddDays(1));
        var oldest = await user.Client.CreateTransactionAsync(
            account.Id, category.Id, date: new DateOnly(2000, 1, 1));

        Assert.Equal(FinanceClientExtensions.Today.AddDays(1), tomorrow.OccurredOn);
        Assert.Equal(new DateOnly(2000, 1, 1), oldest.OccurredOn);
    }

    [Fact]
    public async Task Update_validates_the_input_like_create()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var category = await user.Client.GetSystemCategoryAsync("Продукти");
        var created = await user.Client.CreateTransactionAsync(account.Id, category.Id);

        var response = await user.Client.PutJsonAsync($"/api/transactions/{created.Id}",
            FinanceClientExtensions.TransactionBody(account.Id, category.Id, amount: 0));

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "amount");
    }

    [Fact]
    public async Task Another_user_cannot_read_change_or_delete_the_transaction()
    {
        var owner = await _api.RegisterAsync();
        var stranger = await _api.RegisterAsync();
        var account = await owner.Client.CreateAccountAsync();
        var category = await owner.Client.GetSystemCategoryAsync("Продукти");
        var created = await owner.Client.CreateTransactionAsync(account.Id, category.Id);
        var strangerAccount = await stranger.Client.CreateAccountAsync();

        var get = await stranger.Client.GetAsync($"/api/transactions/{created.Id}");
        var put = await stranger.Client.PutJsonAsync($"/api/transactions/{created.Id}",
            FinanceClientExtensions.TransactionBody(strangerAccount.Id, category.Id));
        var delete = await stranger.Client.DeleteAsync($"/api/transactions/{created.Id}");
        var list = await stranger.Client.GetTransactionsAsync();

        await get.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
        await put.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
        await delete.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
        Assert.Empty(list.Items);
        Assert.Equal(0, list.Total);
        Assert.Single((await owner.Client.GetTransactionsAsync()).Items);
    }

    [Fact]
    public async Task Transaction_endpoints_require_authentication()
    {
        var response = await _api.Anonymous().GetAsync("/api/transactions");

        await response.AssertProblemAsync(HttpStatusCode.Unauthorized, "unauthorized");
    }
}
