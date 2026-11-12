using System.Net;
using System.Text;
using Sable.Application.Transactions;
using Sable.Domain.Enums;
using Sable.Tests.Auth;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Finance;

[Collection(ApiCollection.Name)]
public class TransactionExportTests(ApiFactory factory)
{
    private readonly ApiClient _api = new(factory);

    [Fact]
    public async Task Export_is_not_available_on_the_start_plan()
    {
        var user = await _api.RegisterAsync(planCode: "start");

        var response = await user.Client.GetAsync("/api/transactions/export");

        await response.AssertProblemAsync(HttpStatusCode.Forbidden, "plan_limit");
    }

    [Fact]
    public async Task Export_on_the_plus_plan_returns_a_csv_file()
    {
        var user = await _api.RegisterAsync(planCode: "plus");
        var account = await user.Client.CreateAccountAsync("Картка");
        var food = await user.Client.GetSystemCategoryAsync("Продукти");
        var salary = await user.Client.GetSystemCategoryAsync("Зарплата");
        await user.Client.CreateTransactionAsync(account.Id, food.Id, 1234.5m, date: new DateOnly(2026, 5, 10),
            description: "Він сказав \"привіт\"; і пішов", note: "нотатка");
        await user.Client.CreateTransactionAsync(account.Id, food.Id, 7, date: new DateOnly(2026, 5, 11),
            description: "=SUM(A1)");
        await user.Client.CreateTransactionAsync(account.Id, salary.Id, 100, "Income", new DateOnly(2026, 5, 12),
            "Аванс");

        var response = await user.Client.GetAsync("/api/transactions/export?sort=date_asc");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal($"sable-transactions-{FinanceClientExtensions.Today:yyyy-MM-dd}.csv",
            response.Content.Headers.ContentDisposition?.FileName);

        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal([0xEF, 0xBB, 0xBF], bytes[..3]);

        var lines = Encoding.UTF8.GetString(bytes[3..]).Split("\r\n");
        Assert.Equal("Дата;Тип;Опис;Категорія;Рахунок;Сума;Нотатка", lines[0]);
        Assert.Equal("10.05.2026;Витрата;\"Він сказав \"\"привіт\"\"; і пішов\";Продукти;Картка;1234,50;нотатка", lines[1]);
        Assert.Equal("11.05.2026;Витрата;'=SUM(A1);Продукти;Картка;7,00;", lines[2]);
        Assert.Equal("12.05.2026;Дохід;Аванс;Зарплата;Картка;100,00;", lines[3]);
        Assert.Equal(string.Empty, lines[4]);
    }

    [Fact]
    public async Task Export_applies_the_filters_and_ignores_paging()
    {
        var user = await _api.RegisterAsync(planCode: "plus");
        var account = await user.Client.CreateAccountAsync();
        var food = await user.Client.GetSystemCategoryAsync("Продукти");
        var salary = await user.Client.GetSystemCategoryAsync("Зарплата");
        for (var i = 0; i < 12; i++)
        {
            await user.Client.CreateTransactionAsync(account.Id, food.Id, 1, description: $"Покупка {i}");
        }

        await user.Client.CreateTransactionAsync(account.Id, salary.Id, 100, "Income", description: "Дохід");

        var all = await (await user.Client.GetAsync("/api/transactions/export?pageSize=10")).Content.ReadAsStringAsync();
        var incomeOnly = await (await user.Client.GetAsync("/api/transactions/export?type=Income")).Content.ReadAsStringAsync();

        Assert.Equal(14, all.TrimEnd().Split("\r\n").Length);
        Assert.Equal(2, incomeOnly.TrimEnd().Split("\r\n").Length);
    }

    [Fact]
    public async Task Export_rejects_an_unknown_sort()
    {
        var user = await _api.RegisterAsync(planCode: "plus");

        var response = await user.Client.GetAsync("/api/transactions/export?sort=random");

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "sort");
    }

    [Fact]
    public void Writer_quotes_values_with_separators_quotes_and_line_breaks()
    {
        var rows = new[]
        {
            Row("a;b", "line1\nline2", "say \"x\""),
            Row("+1", "-2", "@home"),
            Row("plain", "Звичайна", "Готівка")
        };

        var text = Encoding.UTF8.GetString(TransactionCsvWriter.Write(rows)[3..]);

        Assert.Contains("\"a;b\";\"line1\nline2\";\"say \"\"x\"\"\";", text);
        Assert.Contains(";'+1;'-2;'@home;", text);
        Assert.Contains(";plain;Звичайна;Готівка;", text);
    }

    [Fact]
    public void Writer_without_rows_still_has_bom_and_header()
    {
        var bytes = TransactionCsvWriter.Write([]);

        Assert.Equal([0xEF, 0xBB, 0xBF], bytes[..3]);
        Assert.Equal(TransactionCsvWriter.Header + "\r\n", Encoding.UTF8.GetString(bytes[3..]));
    }

    private static TransactionDto Row(string description, string category, string account) => new()
    {
        Id = Guid.NewGuid(),
        Type = TransactionType.Expense,
        Amount = 1m,
        OccurredOn = new DateOnly(2026, 1, 2),
        Description = description,
        Account = new IdName(Guid.NewGuid(), account),
        Category = new CategoryRef(Guid.NewGuid(), category, "star", "#6FDBD4")
    };
}
