using Microsoft.AspNetCore.Diagnostics;
using Sable.Application.Common;

namespace Sable.Api.Infrastructure;

/// <summary>Turns bare error status codes (no body) into the standard problem+json response.</summary>
public static class StatusCodeResponses
{
    private const string RouteNotFound = "Ресурс не знайдено";
    private const string MethodNotAllowed = "Метод не підтримується для цього ресурсу";
    private const string JsonExpected = "Очікується тіло запиту у форматі JSON";

    public static Task WriteAsync(StatusCodeContext context)
    {
        var http = context.HttpContext;

        return http.Response.StatusCode switch
        {
            StatusCodes.Status400BadRequest =>
                ProblemDetailsWriter.WriteAsync(http, StatusCodes.Status400BadRequest, "validation_failed", ErrorDetails.ValidationFailed),
            StatusCodes.Status401Unauthorized =>
                ProblemDetailsWriter.WriteAsync(http, StatusCodes.Status401Unauthorized, "unauthorized", ErrorDetails.Unauthorized),
            StatusCodes.Status403Forbidden =>
                ProblemDetailsWriter.WriteAsync(http, StatusCodes.Status403Forbidden, "forbidden", ErrorDetails.Forbidden),
            StatusCodes.Status404NotFound =>
                ProblemDetailsWriter.WriteAsync(http, StatusCodes.Status404NotFound, "not_found", RouteNotFound),
            StatusCodes.Status405MethodNotAllowed =>
                ProblemDetailsWriter.WriteAsync(http, StatusCodes.Status405MethodNotAllowed, "method_not_allowed", MethodNotAllowed),
            StatusCodes.Status415UnsupportedMediaType =>
                ProblemDetailsWriter.WriteAsync(http, StatusCodes.Status400BadRequest, "validation_failed", JsonExpected),
            _ => Task.CompletedTask
        };
    }
}
