using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Sable.Tests.Auth;
using Sable.Tests.Finance;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Hardening;

/// <summary>Checks the JSON field names, types and formats of every response against the API contract.</summary>
[Collection(ApiCollection.Name)]
public partial class ContractShapeTests(ApiFactory factory)
{
    private readonly ApiClient _api = new(factory);

    [Fact]
    public async Task Auth_responses_match_the_contract()
    {
        var email = ApiClient.UniqueEmail();
        var register = await _api.Anonymous().PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Тарас",
            lastName = "Шевченко",
            email,
            password = ApiClient.DefaultPassword,
            planCode = "plus"
        });
        Assert.Equal(HttpStatusCode.Created, register.StatusCode);
        var auth = await register.ReadJsonAsync();
        AssertKeys(auth, "accessToken", "accessTokenExpiresAt", "refreshToken", "user");
        AssertKeys(auth.GetProperty("user"), "id", "email", "firstName", "lastName", "roles", "planCode", "createdAt");
        AssertUtcTimestamp(auth.GetProperty("accessTokenExpiresAt"));
        AssertUtcTimestamp(auth.GetProperty("user").GetProperty("createdAt"));
        Assert.Equal(JsonValueKind.Array, auth.GetProperty("user").GetProperty("roles").ValueKind);
        Assert.True(Guid.TryParse(auth.GetProperty("user").GetProperty("id").GetString(), out _));

        var login = await (await _api.LoginAsync(email, ApiClient.DefaultPassword)).ReadJsonAsync();
        AssertKeys(login, "accessToken", "accessTokenExpiresAt", "refreshToken", "user");

        var refresh = await (await _api.RefreshAsync(auth.GetProperty("refreshToken").GetString()!)).ReadJsonAsync();
        AssertKeys(refresh, "accessToken", "accessTokenExpiresAt", "refreshToken", "user");

        var client = _api.Authorized(auth.GetProperty("accessToken").GetString()!);
        AssertKeys(await (await client.GetAsync("/api/me")).ReadJsonAsync(),
            "id", "email", "firstName", "lastName", "roles", "planCode", "createdAt");
        AssertKeys(await (await client.PutJsonAsync("/api/me", new { firstName = "А", lastName = "Б", email })).ReadJsonAsync(),
            "id", "email", "firstName", "lastName", "roles", "planCode", "createdAt");
        AssertKeys(await (await client.PutJsonAsync("/api/me/plan", new { planCode = "start" })).ReadJsonAsync(),
            "accessToken", "accessTokenExpiresAt", "refreshToken", "user");
    }

    [Fact]
    public async Task Cabinet_responses_match_the_contract()
    {
        var demo = await _api.LoginUserAsync(ApiFactory.DemoEmail, ApiFactory.DemoPassword);
        var client = demo.Client;

        var accounts = await (await client.GetAsync("/api/accounts")).ReadJsonAsync();
        AssertKeys(accounts[0], "id", "name", "type", "initialBalance", "balance", "isDefault", "transactionCount");
        Assert.Equal(JsonValueKind.Number, accounts[0].GetProperty("balance").ValueKind);
        Assert.Contains(accounts[0].GetProperty("type").GetString(), new[] { "Card", "Cash", "Savings" });

        var categories = await (await client.GetAsync("/api/categories")).ReadJsonAsync();
        AssertKeys(categories[0], "id", "name", "type", "icon", "color", "isSystem", "isGoalContribution");

        var transactions = await (await client.GetAsync("/api/transactions")).ReadJsonAsync();
        AssertKeys(transactions, "items", "total", "page", "pageSize", "totalIncome", "totalExpense");
        var item = transactions.GetProperty("items")[0];
        AssertKeys(item, "id", "type", "amount", "occurredOn", "description", "note", "account", "category", "goal");
        AssertKeys(item.GetProperty("account"), "id", "name");
        AssertKeys(item.GetProperty("category"), "id", "name", "icon", "color");
        AssertDate(item.GetProperty("occurredOn"));

        var withGoal = (await (await client.GetAsync("/api/transactions?search=%D0%92%D0%BD%D0%B5%D1%81%D0%BE%D0%BA")).ReadJsonAsync())
            .GetProperty("items")[0];
        AssertKeys(withGoal.GetProperty("goal"), "id", "name");

        var budgets = await (await client.GetAsync("/api/budgets")).ReadJsonAsync();
        AssertKeys(budgets, "month", "totalLimit", "totalSpent", "daysLeft", "perDayLeft", "items");
        AssertKeys(budgets.GetProperty("items")[0], "id", "category", "limitAmount", "spent", "month");
        AssertKeys(budgets.GetProperty("items")[0].GetProperty("category"), "id", "name", "icon", "color");

        var goals = await (await client.GetAsync("/api/goals?includeArchived=true")).ReadJsonAsync();
        AssertKeys(goals[0], "id", "name", "targetAmount", "currentAmount", "deadline", "icon", "color",
            "isAchieved", "isArchived", "monthlyNeeded");
        var dated = goals.EnumerateArray().First(g => g.GetProperty("deadline").ValueKind == JsonValueKind.String);
        AssertDate(dated.GetProperty("deadline"));
        Assert.Equal(JsonValueKind.Number, goals.EnumerateArray().First(g => g.GetProperty("monthlyNeeded").ValueKind != JsonValueKind.Null).GetProperty("monthlyNeeded").ValueKind);

        var dashboard = await (await client.GetAsync("/api/dashboard")).ReadJsonAsync();
        AssertKeys(dashboard, "month", "totalBalance", "income", "expense", "savedPercent", "previous", "monthly", "byCategory", "recent");
        AssertKeys(dashboard.GetProperty("previous"), "totalBalance", "income", "expense", "savedPercent");
        AssertKeys(dashboard.GetProperty("monthly")[0], "month", "income", "expense");
        AssertKeys(dashboard.GetProperty("byCategory")[0], "categoryId", "name", "color", "amount");
        AssertKeys(dashboard.GetProperty("recent")[0], "id", "type", "amount", "occurredOn", "description", "note", "account", "category", "goal");
    }

    [Fact]
    public async Task Create_and_update_responses_match_the_contract()
    {
        var user = await _api.RegisterAsync(planCode: "plus");
        var created = await user.Client.PostJsonAsync("/api/accounts",
            new { name = "Нова", type = "Cash", initialBalance = 1, isDefault = false });
        var account = await created.ReadJsonAsync();
        AssertKeys(account, "id", "name", "type", "initialBalance", "balance", "isDefault", "transactionCount");

        var expense = await user.Client.GetSystemCategoryAsync("Продукти");
        var transaction = await (await user.Client.PostJsonAsync("/api/transactions", FinanceClientExtensions.TransactionBody(
            Guid.Parse(account.GetProperty("id").GetString()!), expense.Id))).ReadJsonAsync();
        AssertKeys(transaction, "id", "type", "amount", "occurredOn", "description", "note", "account", "category", "goal");

        var category = await (await user.Client.PostJsonAsync("/api/categories",
            new { name = "Хобі", type = "Expense", icon = "star", color = "#6FDBD4" })).ReadJsonAsync();
        AssertKeys(category, "id", "name", "type", "icon", "color", "isSystem", "isGoalContribution");

        var budget = await (await user.Client.PostJsonAsync("/api/budgets",
            new { categoryId = expense.Id, limitAmount = 100 })).ReadJsonAsync();
        AssertKeys(budget, "id", "category", "limitAmount", "spent", "month");

        var goal = await (await user.Client.PostJsonAsync("/api/goals", FinanceClientExtensions.GoalBody())).ReadJsonAsync();
        AssertKeys(goal, "id", "name", "targetAmount", "currentAmount", "deadline", "icon", "color",
            "isAchieved", "isArchived", "monthlyNeeded");
    }

    [Fact]
    public async Task Public_responses_match_the_contract()
    {
        var client = _api.Anonymous();

        var plans = await (await client.GetAsync("/api/plans")).ReadJsonAsync();
        AssertKeys(plans, "plans", "features");
        AssertKeys(plans.GetProperty("plans")[0], "code", "name", "description", "priceMonthly", "priceYearlyPerMonth", "isPopular");
        var feature = plans.GetProperty("features")[0];
        AssertKeys(feature, "id", "name", "values");
        AssertKeys(feature.GetProperty("values").GetProperty("start"), "kind", "text");

        var reviews = await (await client.GetAsync("/api/reviews")).ReadJsonAsync();
        AssertKeys(reviews, "average", "items");
        AssertKeys(reviews.GetProperty("items")[0], "id", "author", "text", "rating");
        Assert.Equal(JsonValueKind.Number, reviews.GetProperty("average").ValueKind);

        var faq = await (await client.GetAsync("/api/faq")).ReadJsonAsync();
        AssertKeys(faq[0], "id", "name", "items");
        AssertKeys(faq[0].GetProperty("items")[0], "id", "question", "answer");

        var contact = await client.PostJsonAsync("/api/contact", new
        {
            name = "Ірина",
            email = "ok@test.ua",
            topic = "Питання",
            message = "Достатньо довге повідомлення",
            consent = true
        });
        Assert.Equal(HttpStatusCode.Created, contact.StatusCode);
        AssertKeys(await contact.ReadJsonAsync(), "id");

        var health = await (await client.GetAsync("/health")).ReadJsonAsync();
        AssertKeys(health, "status");
    }

    [Fact]
    public async Task Admin_responses_match_the_contract()
    {
        var admin = (await _api.LoginAsAdminAsync()).Client;

        var users = await (await admin.GetAsync("/api/admin/users")).ReadJsonAsync();
        AssertKeys(users, "items", "total", "page", "pageSize");
        AssertKeys(users.GetProperty("items")[0], "id", "email", "firstName", "lastName", "role", "planCode",
            "isBlocked", "createdAt", "transactionCount");
        AssertUtcTimestamp(users.GetProperty("items")[0].GetProperty("createdAt"));
        AssertKeys(await (await admin.GetAsync("/api/admin/users/stats")).ReadJsonAsync(),
            "total", "activeThisMonth", "onPlus", "blocked");

        var plans = await (await admin.GetAsync("/api/admin/plans")).ReadJsonAsync();
        AssertKeys(plans[0], "id", "code", "name", "description", "priceMonthly", "priceYearlyPerMonth",
            "isPopular", "isPublished", "sortOrder", "userCount");
        var features = await (await admin.GetAsync("/api/admin/plan-features")).ReadJsonAsync();
        AssertKeys(features[0], "id", "name", "sortOrder", "values");

        var reviews = await (await admin.GetAsync("/api/admin/reviews")).ReadJsonAsync();
        AssertKeys(reviews, "items", "total", "page", "pageSize");
        AssertKeys(reviews.GetProperty("items")[0], "id", "author", "text", "rating", "isPublished", "createdAt");
        AssertUtcTimestamp(reviews.GetProperty("items")[0].GetProperty("createdAt"));

        var topics = await (await admin.GetAsync("/api/admin/faq/topics")).ReadJsonAsync();
        AssertKeys(topics[0], "id", "name", "sortOrder", "itemCount");
        var items = await (await admin.GetAsync("/api/admin/faq/items")).ReadJsonAsync();
        AssertKeys(items[0], "id", "topicId", "topicName", "question", "answer", "isPublished", "sortOrder", "updatedAt");
        AssertUtcTimestamp(items[0].GetProperty("updatedAt"));
    }

    [Fact]
    public async Task Error_responses_match_the_contract()
    {
        var response = await _api.Anonymous().PostJsonAsync("/api/auth/register", new { email = "bad" });

        var error = await response.ReadJsonAsync();
        AssertKeys(error, "type", "title", "status", "detail", "code", "errors");
        Assert.Equal("https://sable.ua/errors/validation_failed", error.GetProperty("type").GetString());
        Assert.All(error.GetProperty("errors").EnumerateObject(), p => Assert.Equal(JsonValueKind.Array, p.Value.ValueKind));
        Assert.All(error.GetProperty("errors").EnumerateObject().Select(p => p.Name), name => Assert.True(char.IsLower(name[0])));

        var notFound = await (await _api.Anonymous().GetAsync("/api/nothing")).ReadJsonAsync();
        AssertKeys(notFound, "type", "title", "status", "detail", "code");
    }

    private static void AssertKeys(JsonElement element, params string[] expected)
    {
        Assert.Equal(JsonValueKind.Object, element.ValueKind);
        Assert.Equal(expected.Order(), element.EnumerateObject().Select(p => p.Name).Order());
    }

    private static void AssertUtcTimestamp(JsonElement element) =>
        Assert.Matches(UtcTimestamp(), element.GetString()!);

    private static void AssertDate(JsonElement element) =>
        Assert.Matches(DateOnlyPattern(), element.GetString()!);

    [GeneratedRegex(@"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$")]
    private static partial Regex UtcTimestamp();

    [GeneratedRegex(@"^\d{4}-\d{2}-\d{2}$")]
    private static partial Regex DateOnlyPattern();
}
