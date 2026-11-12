using System.Net;
using Sable.Tests.Auth;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Finance;

[Collection(ApiCollection.Name)]
public class TransactionListTests(ApiFactory factory)
{
    private readonly ApiClient _api = new(factory);

    [Fact]
    public async Task Default_sort_is_date_descending_and_amount_sort_is_available()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var category = await user.Client.GetSystemCategoryAsync("Продукти");
        await user.Client.CreateTransactionAsync(account.Id, category.Id, 30, date: new DateOnly(2026, 5, 1), description: "середня");
        await user.Client.CreateTransactionAsync(account.Id, category.Id, 10, date: new DateOnly(2026, 6, 1), description: "найновіша");
        await user.Client.CreateTransactionAsync(account.Id, category.Id, 20, date: new DateOnly(2026, 4, 1), description: "найстаріша");

        var byDefault = await user.Client.GetTransactionsAsync();
        var dateAsc = await user.Client.GetTransactionsAsync("?sort=date_asc");
        var amountAsc = await user.Client.GetTransactionsAsync("?sort=amount_asc");
        var amountDesc = await user.Client.GetTransactionsAsync("?sort=amount_desc");

        Assert.Equal(["найновіша", "середня", "найстаріша"], byDefault.Items.Select(t => t.Description));
        Assert.Equal(["найстаріша", "середня", "найновіша"], dateAsc.Items.Select(t => t.Description));
        Assert.Equal([10m, 20m, 30m], amountAsc.Items.Select(t => t.Amount));
        Assert.Equal([30m, 20m, 10m], amountDesc.Items.Select(t => t.Amount));
    }

    [Fact]
    public async Task Unknown_sort_is_rejected()
    {
        var user = await _api.RegisterAsync();

        var response = await user.Client.GetAsync("/api/transactions?sort=random");

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "sort");
    }

    [Fact]
    public async Task Filters_narrow_the_list()
    {
        var user = await _api.RegisterAsync();
        var card = await user.Client.CreateAccountAsync("Картка");
        var cash = await user.Client.CreateAccountAsync("Готівка");
        var food = await user.Client.GetSystemCategoryAsync("Продукти");
        var salary = await user.Client.GetSystemCategoryAsync("Зарплата");
        await user.Client.CreateTransactionAsync(card.Id, food.Id, 10, date: new DateOnly(2026, 5, 10), description: "Кава у Львові");
        await user.Client.CreateTransactionAsync(cash.Id, food.Id, 20, date: new DateOnly(2026, 5, 15), description: "Хліб");
        await user.Client.CreateTransactionAsync(card.Id, salary.Id, 500, "Income", new DateOnly(2026, 5, 20), "Аванс");

        var byType = await user.Client.GetTransactionsAsync("?type=Income");
        var byAccount = await user.Client.GetTransactionsAsync($"?accountId={cash.Id}");
        var byCategory = await user.Client.GetTransactionsAsync($"?categoryId={food.Id}");
        var from = await user.Client.GetTransactionsAsync("?from=2026-05-15");
        var to = await user.Client.GetTransactionsAsync("?to=2026-05-15");
        var exact = await user.Client.GetTransactionsAsync("?from=2026-05-15&to=2026-05-15");
        var search = await user.Client.GetTransactionsAsync("?search=%D0%9A%D0%90%D0%92%D0%90");
        var blankSearch = await user.Client.GetTransactionsAsync("?search=%20%20");
        var combined = await user.Client.GetTransactionsAsync($"?accountId={card.Id}&type=Expense");

        Assert.Equal(["Аванс"], byType.Items.Select(t => t.Description));
        Assert.Equal(["Хліб"], byAccount.Items.Select(t => t.Description));
        Assert.Equal(2, byCategory.Total);
        Assert.Equal(["Аванс", "Хліб"], from.Items.Select(t => t.Description));
        Assert.Equal(["Хліб", "Кава у Львові"], to.Items.Select(t => t.Description));
        Assert.Equal(["Хліб"], exact.Items.Select(t => t.Description));
        Assert.Equal(["Кава у Львові"], search.Items.Select(t => t.Description));
        Assert.Equal(3, blankSearch.Total);
        Assert.Equal(["Кава у Львові"], combined.Items.Select(t => t.Description));
    }

    [Fact]
    public async Task Reversed_date_range_is_rejected()
    {
        var user = await _api.RegisterAsync();

        var response = await user.Client.GetAsync("/api/transactions?from=2026-06-01&to=2026-05-01");

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "to");
    }

    [Fact]
    public async Task Paging_splits_the_list_and_reports_the_total()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var category = await user.Client.GetSystemCategoryAsync("Продукти");
        for (var i = 0; i < 25; i++)
        {
            await user.Client.CreateTransactionAsync(account.Id, category.Id, i + 1, description: $"Покупка {i + 1}");
        }

        var first = await user.Client.GetTransactionsAsync("?pageSize=10&page=1");
        var second = await user.Client.GetTransactionsAsync("?pageSize=10&page=2");
        var third = await user.Client.GetTransactionsAsync("?pageSize=10&page=3");
        var beyond = await user.Client.GetTransactionsAsync("?page=99");

        Assert.Equal([10, 10, 5], [first.Items.Count, second.Items.Count, third.Items.Count]);
        Assert.All([first, second, third], page => Assert.Equal(25, page.Total));
        Assert.Equal(3, third.Page);
        Assert.Equal(10, third.PageSize);
        var allIds = first.Items.Concat(second.Items).Concat(third.Items).Select(t => t.Id).ToList();
        Assert.Equal(25, allIds.Distinct().Count());
        Assert.Empty(beyond.Items);
        Assert.Equal(25, beyond.Total);
    }

    [Fact]
    public async Task Paging_is_stable_when_many_rows_share_the_same_date()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var category = await user.Client.GetSystemCategoryAsync("Продукти");
        for (var i = 0; i < 12; i++)
        {
            await user.Client.CreateTransactionAsync(account.Id, category.Id, 5, date: new DateOnly(2026, 5, 5));
        }

        var first = await user.Client.GetTransactionsAsync("?sort=amount_desc&pageSize=10&page=1");
        var second = await user.Client.GetTransactionsAsync("?sort=amount_desc&pageSize=10&page=2");

        var ids = first.Items.Concat(second.Items).Select(t => t.Id).ToList();
        Assert.Equal(12, ids.Distinct().Count());
    }

    [Theory]
    [InlineData("pageSize=7", "pageSize")]
    [InlineData("pageSize=0", "pageSize")]
    [InlineData("page=0", "page")]
    [InlineData("page=-1", "page")]
    public async Task Invalid_paging_values_are_rejected(string query, string field)
    {
        var user = await _api.RegisterAsync();

        var response = await user.Client.GetAsync("/api/transactions?" + query);

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", field);
    }

    [Fact]
    public async Task Malformed_query_values_are_rejected_in_ukrainian()
    {
        var user = await _api.RegisterAsync();

        var response = await user.Client.GetAsync("/api/transactions?page=abc&from=notadate");

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "page");
        var body = await (await user.Client.GetAsync("/api/transactions?page=abc")).ReadJsonAsync();
        Assert.Equal("Некоректне значення", body.GetProperty("errors").GetProperty("page")[0].GetString());
    }

    [Fact]
    public async Task Totals_cover_all_filtered_rows_and_not_only_the_current_page()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var expense = await user.Client.GetSystemCategoryAsync("Продукти");
        var income = await user.Client.GetSystemCategoryAsync("Зарплата");
        for (var i = 0; i < 15; i++)
        {
            await user.Client.CreateTransactionAsync(account.Id, expense.Id, 10.5m);
        }

        for (var i = 0; i < 10; i++)
        {
            await user.Client.CreateTransactionAsync(account.Id, income.Id, 100, "Income");
        }

        var all = await user.Client.GetTransactionsAsync("?pageSize=10");
        var onlyExpenses = await user.Client.GetTransactionsAsync("?type=Expense&pageSize=10&page=2");

        Assert.Equal(25, all.Total);
        Assert.Equal(1000m, all.TotalIncome);
        Assert.Equal(157.5m, all.TotalExpense);
        Assert.Equal(5, onlyExpenses.Items.Count);
        Assert.Equal(0m, onlyExpenses.TotalIncome);
        Assert.Equal(157.5m, onlyExpenses.TotalExpense);
    }

    [Fact]
    public async Task Empty_result_has_zero_totals()
    {
        var user = await _api.RegisterAsync();

        var list = await user.Client.GetTransactionsAsync("?search=nothing");

        Assert.Empty(list.Items);
        Assert.Equal(0, list.Total);
        Assert.Equal(0m, list.TotalIncome);
        Assert.Equal(0m, list.TotalExpense);
    }
}
