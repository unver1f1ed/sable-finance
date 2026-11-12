using Microsoft.AspNetCore.Diagnostics;
using Sable.Application.Common;

namespace Sable.Api.Infrastructure;

public class ExceptionHandler(ILogger<ExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is AppException appException)
        {
            await ProblemDetailsWriter.WriteAsync(
                httpContext, appException.Status, appException.Code, appException.Message, appException.Errors);
            return true;
        }

        logger.LogError(exception, "Unhandled exception while processing {Method} {Path}",
            httpContext.Request.Method, httpContext.Request.Path);

        await ProblemDetailsWriter.WriteAsync(
            httpContext, StatusCodes.Status500InternalServerError, "server_error", ErrorDetails.ServerError);
        return true;
    }
}
