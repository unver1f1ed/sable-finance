using System.Text.Json.Serialization;

namespace Sable.Api.Infrastructure;

public sealed record ApiError(
    string Type,
    string Title,
    int Status,
    string Detail,
    string Code,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    IDictionary<string, string[]>? Errors = null);

public static class ProblemDetailsWriter
{
    public const string ContentType = "application/problem+json";

    private static readonly Dictionary<string, string> Titles = new()
    {
        ["validation_failed"] = "Validation failed",
        ["unauthorized"] = "Unauthorized",
        ["invalid_credentials"] = "Invalid credentials",
        ["invalid_refresh_token"] = "Invalid refresh token",
        ["forbidden"] = "Forbidden",
        ["account_blocked"] = "Account blocked",
        ["plan_limit"] = "Plan limit reached",
        ["not_found"] = "Not found",
        ["email_taken"] = "Email already in use",
        ["conflict"] = "Conflict",
        ["server_error"] = "Server error"
    };

    public static ApiError Create(int status, string code, string detail, IDictionary<string, string[]>? errors = null) =>
        new(
            $"https://sable.ua/errors/{code}",
            Titles.GetValueOrDefault(code, "Error"),
            status,
            detail,
            code,
            errors);

    public static Task WriteAsync(
        HttpContext context,
        int status,
        string code,
        string detail,
        IDictionary<string, string[]>? errors = null)
    {
        context.Response.StatusCode = status;
        return context.Response.WriteAsJsonAsync(
            Create(status, code, detail, errors),
            options: null,
            contentType: ContentType,
            cancellationToken: context.RequestAborted);
    }
}
