using Microsoft.AspNetCore.Diagnostics;
using Sable.Application.Common;

namespace Sable.Api.Infrastructure;

public static class StatusCodeResponses
{
    public static Task WriteAsync(StatusCodeContext context)
    {
        var error = context.HttpContext.Response.StatusCode switch
        {
            StatusCodes.Status401Unauthorized => Errors.Unauthorized(),
            StatusCodes.Status403Forbidden => Errors.Forbidden(),
            StatusCodes.Status404NotFound => Errors.NotFound("Ресурс не знайдено"),
            _ => null
        };

        return error is null
            ? Task.CompletedTask
            : ProblemDetailsWriter.WriteAsync(context.HttpContext, error.Status, error.Code, error.Message);
    }
}
