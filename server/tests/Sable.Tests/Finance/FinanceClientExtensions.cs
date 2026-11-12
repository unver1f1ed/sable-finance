using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Sable.Application.Accounts;
using Sable.Application.Categories;
using Sable.Application.Dashboard;
using Sable.Application.Transactions;

namespace Sable.Tests.Finance;

public static class Json
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };
}

public static class FinanceClientExtensions
{
    public static DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow);

    public static async Task<T> ReadAsync<T>(this HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<T>(Json.Options))!;

    public static async Task<JsonElement> ReadJsonAsync(this HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>();

    public static Task<HttpResponseMessage> PostJsonAsync(this HttpClient client, string url, object body) =>
        client.PostAsJsonAsync(url, body, Json.Options);

    public static Task<HttpResponseMessage> PutJsonAsync(this HttpClient client, string url, object body) =>
        client.PutAsJsonAsync(url, body, Json.Options);

    public static async Task<AccountDto> CreateAccountAsync(
        this HttpClient client,
        string name = "Картка",
        decimal initialBalance = 0,
        bool isDefault = false,
        string type = "Card")
    {
        var response = await client.PostJsonAsync("/api/accounts", new { name, type, initialBalance, isDefault });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await response.ReadAsync<AccountDto>();
    }

    public static async Task<IReadOnlyList<AccountDto>> GetAccountsAsync(this HttpClient client) =>
        await (await client.GetAsync("/api/accounts")).ReadAsync<List<AccountDto>>();

    public static async Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(this HttpClient client, string? type = null)
    {
        var url = type is null ? "/api/categories" : $"/api/categories?type={type}";
        return await (await client.GetAsync(url)).ReadAsync<List<CategoryDto>>();
    }

    public static async Task<CategoryDto> GetSystemCategoryAsync(this HttpClient client, string name) =>
        (await client.GetCategoriesAsync()).First(c => c.IsSystem && c.Name == name);

    public static async Task<CategoryDto> CreateCategoryAsync(
        this HttpClient client,
        string name,
        string type = "Expense",
        string icon = "star",
        string color = "#6FDBD4")
    {
        var response = await client.PostJsonAsync("/api/categories", new { name, type, icon, color });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await response.ReadAsync<CategoryDto>();
    }

    public static object TransactionBody(
        Guid accountId,
        Guid categoryId,
        decimal amount = 10,
        string type = "Expense",
        DateOnly? date = null,
        string description = "Покупка",
        string? note = null,
        Guid? goalId = null) => new
    {
        type,
        amount,
        occurredOn = (date ?? Today).ToString("yyyy-MM-dd"),
        description,
        note,
        accountId,
        categoryId,
        goalId
    };

    public static async Task<TransactionDto> CreateTransactionAsync(
        this HttpClient client,
        Guid accountId,
        Guid categoryId,
        decimal amount = 10,
        string type = "Expense",
        DateOnly? date = null,
        string description = "Покупка",
        string? note = null)
    {
        var body = TransactionBody(accountId, categoryId, amount, type, date, description, note);
        var response = await client.PostJsonAsync("/api/transactions", body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await response.ReadAsync<TransactionDto>();
    }

    public static async Task<TransactionList> GetTransactionsAsync(this HttpClient client, string query = "")
    {
        var response = await client.GetAsync("/api/transactions" + query);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadAsync<TransactionList>();
    }

    public static async Task<DashboardDto> GetDashboardAsync(this HttpClient client, string? month = null)
    {
        var response = await client.GetAsync(month is null ? "/api/dashboard" : $"/api/dashboard?month={month}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadAsync<DashboardDto>();
    }

    public static async Task AssertProblemAsync(
        this HttpResponseMessage response,
        HttpStatusCode status,
        string code,
        string? field = null)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var body = await response.ReadJsonAsync();
        Assert.Equal(code, body.GetProperty("code").GetString());
        if (field is not null)
        {
            Assert.True(
                body.GetProperty("errors").TryGetProperty(field, out _),
                $"Expected an error for field '{field}', got: {body}");
        }
    }
}
