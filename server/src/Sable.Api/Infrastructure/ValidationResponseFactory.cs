using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Sable.Application.Common;

namespace Sable.Api.Infrastructure;

public static class ValidationResponseFactory
{
    private const string InvalidValueMessage = "Некоректне значення";

    public static IActionResult Create(ActionContext context)
    {
        var errors = new Dictionary<string, string[]>();

        foreach (var (key, entry) in context.ModelState)
        {
            if (entry.ValidationState != ModelValidationState.Invalid)
            {
                continue;
            }

            var generic = key.Length == 0 || key.StartsWith('$');
            var messages = entry.Errors
                .Select(e => !generic && e.Exception is null && !string.IsNullOrWhiteSpace(e.ErrorMessage)
                    ? e.ErrorMessage
                    : InvalidValueMessage)
                .Distinct()
                .ToArray();

            errors[ToCamelCasePath(key)] = messages;
        }

        var fallback = Errors.Validation(errors);
        var body = ProblemDetailsWriter.Create(fallback.Status, fallback.Code, fallback.Message, errors);

        return new ObjectResult(body)
        {
            StatusCode = body.Status,
            ContentTypes = { ProblemDetailsWriter.ContentType }
        };
    }

    private static string ToCamelCasePath(string path)
    {
        if (path.StartsWith("$.", StringComparison.Ordinal))
        {
            path = path[2..];
        }

        return string.Join('.', path.Split('.').Select(ToCamelCase));
    }

    private static string ToCamelCase(string segment) =>
        segment.Length == 0 || char.IsLower(segment[0])
            ? segment
            : char.ToLowerInvariant(segment[0]) + segment[1..];
}
