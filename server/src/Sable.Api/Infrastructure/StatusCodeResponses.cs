using Microsoft.AspNetCore.Diagnostics;
using Sable.Application.Common;

namespace Sable.Api.Infrastructure;

public static class StatusCodeResponses
{
    private const string RouteNotFound = "Ресурс не знайдено";

    public static Task WriteAsync(StatusCodeContext context)
    {
        var http = context.HttpContext;

        return http.Response.StatusCode switch
        {
            StatusCodes.Status401Unauthorized =>
                ProblemDetailsWriter.WriteAsync(http, StatusCodes.Status401Unauthorized, "unauthorized", ErrorDetails.Unauthorized),
            StatusCodes.Status403Forbidden =>
                ProblemDetailsWriter.WriteAsync(http, StatusCodes.Status403Forbidden, "forbidden", ErrorDetails.Forbidden),
            StatusCodes.Status404NotFound =>
                ProblemDetailsWriter.WriteAsync(http, StatusCodes.Status404NotFound, "not_found", RouteNotFound),
            _ => Task.CompletedTask
        };
    }
}
