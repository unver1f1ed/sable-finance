using System.Net;
using System.Net.Http.Json;
using System.Text;
using Sable.Tests.Auth;
using Sable.Tests.Finance;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Hardening;

[Collection(ApiCollection.Name)]
public class RobustnessTests(ApiFactory factory)
{
    private static readonly string TenThousand = new('я', 10_000);

    private readonly ApiClient _api = new(factory);

    public static readonly string[] BodyRoutes =
    [
        "POST /api/auth/register",
        "POST /api/auth/login",
        "POST /api/auth/refresh",
        "POST /api/auth/logout",
        "PUT /api/me",
        "PUT /api/me/password",
        "PUT /api/me/plan",
        "DELETE /api/me",
        "POST /api/accounts",
        "PUT /api/accounts/{id}",
        "POST /api/categories",
        "PUT /api/categories/{id}",
        "POST /api/transactions",
        "PUT /api/transactions/{id}",
        "POST /api/budgets",
        "PUT /api/budgets/{id}",
        "POST /api/goals",
        "PUT /api/goals/{id}",
        "POST /api/goals/{id}/contributions",
        "POST /api/contact",
        "PUT /api/admin/users/{id}",
        "PUT /api/admin/plans/{id}",
        "POST /api/admin/plan-features",
        "PUT /api/admin/plan-features/order",
        "PUT /api/admin/plan-features/{id}",
        "POST /api/admin/reviews",
        "PUT /api/admin/reviews/{id}",
        "POST /api/admin/faq/topics",
        "POST /api/admin/faq/items",
        "PUT /api/admin/faq/items/{id}"
    ];

    public static TheoryData<string> BodyRouteData => new(BodyRoutes);

    [Theory]
    [MemberData(nameof(BodyRouteData))]
    public async Task Malformed_bodies_and_wrong_content_types_are_rejected_with_400(string route)
    {
        var admin = await _api.LoginAsAdminAsync();
        var parts = route.Split(' ');
        var url = "/" + parts[1].TrimStart('/').Replace("{id}", Guid.NewGuid().ToString());

        var bodies = new (string Name, string Content, string ContentType)[]
        {
            ("garbage", "garbage", "application/json"),
            ("truncated", "{\"a\":", "application/json"),
            ("empty", string.Empty, "application/json"),
            ("array", "[]", "application/json"),
            ("null", "null", "application/json"),
            ("number", "123", "application/json"),
            ("text", "{}", "text/plain"),
            ("form", "a=b", "application/x-www-form-urlencoded")
        };

        foreach (var (name, content, contentType) in bodies)
        {
            var request = new HttpRequestMessage(new HttpMethod(parts[0]), url)
            {
                Content = new StringContent(content, Encoding.UTF8, contentType)
            };

            var response = await admin.Client.SendAsync(request);

            Assert.True(
                response.StatusCode == HttpStatusCode.BadRequest,
                $"{route} with a {name} body returned {(int)response.StatusCode} instead of 400");
            await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed");
        }
    }

    [Theory]
    [MemberData(nameof(BodyRouteData))]
    public async Task Requests_without_any_content_type_are_rejected_with_400(string route)
    {
        var admin = await _api.LoginAsAdminAsync();
        var parts = route.Split(' ');
        var url = "/" + parts[1].TrimStart('/').Replace("{id}", Guid.NewGuid().ToString());

        var response = await admin.Client.SendAsync(new HttpRequestMessage(new HttpMethod(parts[0]), url));

        Assert.True((int)response.StatusCode < 500, $"{route} without a body returned {(int)response.StatusCode}");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    public static TheoryData<string, string, string> LongTextCases() => new()
    {
        { "POST /api/transactions", "description", "transaction" },
        { "POST /api/transactions", "note", "transaction" },
        { "POST /api/accounts", "name", "account" },
        { "POST /api/categories", "name", "category" },
        { "POST /api/categories", "icon", "category" },
        { "POST /api/categories", "color", "category" },
        { "POST /api/goals", "name", "goal" },
        { "POST /api/goals", "icon", "goal" },
        { "POST /api/goals", "color", "goal" },
        { "POST /api/contact", "name", "contact" },
        { "POST /api/contact", "email", "contact" },
        { "POST /api/contact", "topic", "contact" },
        { "POST /api/contact", "message", "contact" },
        { "POST /api/admin/reviews", "author", "review" },
        { "POST /api/admin/reviews", "text", "review" },
        { "POST /api/admin/faq/topics", "name", "topic" },
        { "POST /api/admin/faq/items", "question", "faq" },
        { "POST /api/admin/faq/items", "answer", "faq" },
        { "POST /api/admin/plan-features", "name", "feature" },
        { "POST /api/auth/register", "firstName", "register" },
        { "POST /api/auth/register", "lastName", "register" },
        { "POST /api/auth/register", "email", "register" },
        { "POST /api/auth/register", "password", "register" },
        { "POST /api/auth/register", "planCode", "register" },
        { "POST /api/auth/login", "email", "login" },
        { "POST /api/auth/login", "password", "login" },
        { "PUT /api/admin/plans/{id}", "name", "plan" },
        { "PUT /api/admin/plans/{id}", "description", "plan" }
    };

    [Theory]
    [MemberData(nameof(LongTextCases))]
    public async Task A_ten_thousand_character_text_field_is_rejected_with_400_and_never_reaches_the_database(
        string route,
        string field,
        string kind)
    {
        var admin = await _api.LoginAsAdminAsync();
        var body = ValidBody(kind);
        body[field] = TenThousand;
        var parts = route.Split(' ');
        var url = "/" + parts[1].TrimStart('/').Replace("{id}", Guid.NewGuid().ToString());

        var response = await admin.Client.SendAsync(new HttpRequestMessage(new HttpMethod(parts[0]), url)
        {
            Content = JsonContent.Create(body)
        });

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", field);
    }

    [Fact]
    public async Task The_nul_character_is_rejected_in_bodies_and_query_strings()
    {
        var admin = await _api.LoginAsAdminAsync();
        var body = ValidBody("contact");
        body["message"] = "Повідомлення з \u0000 символом";

        var inBody = await admin.Client.PostAsJsonAsync("/api/contact", body);
        var inQuery = await admin.Client.GetAsync("/api/transactions?search=%00");
        var inFilter = await admin.Client.GetAsync("/api/admin/users?planCode=%00");

        await inBody.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "message");
        await inQuery.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "search");
        await inFilter.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "planCode");
    }

    [Fact]
    public async Task Wrong_method_returns_405_as_problem_json()
    {
        var response = await _api.Anonymous().DeleteAsync("/api/plans");

        await response.AssertProblemAsync(HttpStatusCode.MethodNotAllowed, "method_not_allowed");
    }

    [Theory]
    [InlineData("GET", "/api/does-not-exist")]
    [InlineData("GET", "/api/transactions/not-a-guid")]
    [InlineData("PUT", "/api/accounts/123")]
    [InlineData("DELETE", "/api/goals/abc")]
    public async Task Unknown_routes_and_malformed_ids_return_404_as_problem_json(string method, string url)
    {
        var admin = await _api.LoginAsAdminAsync();

        var response = await admin.Client.SendAsync(new HttpRequestMessage(new HttpMethod(method), url)
        {
            Content = method == "PUT" ? JsonContent.Create(new { }) : null
        });

        await response.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
    }

    [Fact]
    public async Task Garbage_in_query_strings_never_causes_a_server_error()
    {
        var admin = await _api.LoginAsAdminAsync();

        foreach (var url in new[]
        {
            "/api/transactions?page=abc&pageSize=x&from=nope&to=-1&type=zzz&accountId=1&categoryId=2&sort=%00",
            "/api/budgets?month=%00",
            "/api/dashboard?month=" + TenThousand,
            "/api/goals?includeArchived=maybe",
            "/api/categories?type=nothing",
            "/api/faq?search=" + TenThousand,
            "/api/admin/users?page=-5&pageSize=9999&role=%27%3B--&status=1&planCode=%00",
            "/api/admin/reviews?rating=abc&status=%00",
            "/api/admin/faq/items?topicId=bad"
        })
        {
            var response = await admin.Client.GetAsync(url);

            Assert.True((int)response.StatusCode < 500, $"{url} returned {(int)response.StatusCode}");
        }
    }

    private static Dictionary<string, object?> ValidBody(string kind) => kind switch
    {
        "transaction" => new()
        {
            ["type"] = "Expense",
            ["amount"] = 10,
            ["occurredOn"] = "2026-05-05",
            ["description"] = "Кава",
            ["accountId"] = Guid.NewGuid(),
            ["categoryId"] = Guid.NewGuid()
        },
        "account" => new() { ["name"] = "Картка", ["type"] = "Card", ["initialBalance"] = 0, ["isDefault"] = false },
        "category" => new() { ["name"] = "Нова", ["type"] = "Expense", ["icon"] = "star", ["color"] = "#6FDBD4" },
        "goal" => new() { ["name"] = "Ціль", ["targetAmount"] = 100, ["icon"] = "target", ["color"] = "#6FDBD4" },
        "contact" => new()
        {
            ["name"] = "Ірина",
            ["email"] = "ok@test.ua",
            ["topic"] = "Питання",
            ["message"] = "Достатньо довге повідомлення",
            ["consent"] = true
        },
        "review" => new() { ["author"] = "Автор", ["text"] = "Достатньо довгий текст відгуку", ["rating"] = 5, ["isPublished"] = true },
        "topic" => new() { ["name"] = "Тема" },
        "faq" => new()
        {
            ["topicId"] = Guid.NewGuid(),
            ["question"] = "Нормальне питання",
            ["answer"] = "Достатньо довга відповідь",
            ["isPublished"] = true
        },
        "feature" => new() { ["name"] = "Нова характеристика", ["values"] = new { } },
        "register" => new()
        {
            ["firstName"] = "Тарас",
            ["lastName"] = "Шевченко",
            ["email"] = "taras@test.ua",
            ["password"] = "Passw0rd123",
            ["planCode"] = "start"
        },
        "login" => new() { ["email"] = "taras@test.ua", ["password"] = "Passw0rd123" },
        "plan" => new()
        {
            ["name"] = "Назва",
            ["description"] = "Опис",
            ["priceMonthly"] = 10,
            ["priceYearlyPerMonth"] = 5,
            ["isPopular"] = false,
            ["isPublished"] = true
        },
        _ => throw new ArgumentOutOfRangeException(nameof(kind))
    };
}
