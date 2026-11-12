using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Sable.Tests.Infrastructure;

namespace Sable.Tests;

[Collection(ApiCollection.Name)]
public class ErrorFormatTests(ApiFactory factory)
{
    private const string ProblemJson = "application/problem+json";

    [Fact]
    public async Task Unknown_route_returns_not_found_problem()
    {
        var response = await factory.CreateClient().GetAsync("/api/does-not-exist");

        var body = await AssertProblemAsync(response, HttpStatusCode.NotFound, "not_found");
        Assert.Equal("https://sable.ua/errors/not_found", body.GetProperty("type").GetString());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("detail").GetString()));
    }

    [Fact]
    public async Task Invalid_model_returns_validation_problem_with_camel_case_fields()
    {
        var response = await factory.CreateClient().PostAsJsonAsync("/test-errors/validate", new { count = 99 });

        var body = await AssertProblemAsync(response, HttpStatusCode.BadRequest, "validation_failed");
        var errors = body.GetProperty("errors");
        Assert.True(errors.TryGetProperty("userName", out var userName));
        Assert.NotEmpty(userName.EnumerateArray());
        Assert.True(errors.TryGetProperty("count", out _));
    }

    [Fact]
    public async Task App_exception_keeps_its_status_and_code()
    {
        var response = await factory.CreateClient().GetAsync("/test-errors/conflict");

        var body = await AssertProblemAsync(response, HttpStatusCode.Conflict, "conflict");
        Assert.Equal("Запис уже існує", body.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Unexpected_exception_returns_generic_server_error_without_details()
    {
        var response = await factory.CreateClient().GetAsync("/test-errors/unexpected");

        var raw = await response.Content.ReadAsStringAsync();
        var body = await AssertProblemAsync(response, HttpStatusCode.InternalServerError, "server_error", raw);
        Assert.DoesNotContain("sensitive internal detail", raw);
        Assert.DoesNotContain("InvalidOperationException", raw);
        Assert.False(body.TryGetProperty("errors", out _));
    }

    private static async Task<JsonElement> AssertProblemAsync(
        HttpResponseMessage response,
        HttpStatusCode status,
        string code,
        string? raw = null)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal(ProblemJson, response.Content.Headers.ContentType?.MediaType);

        var body = JsonDocument.Parse(raw ?? await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal(code, body.GetProperty("code").GetString());
        Assert.Equal((int)status, body.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("title").GetString()));
        return body;
    }
}
