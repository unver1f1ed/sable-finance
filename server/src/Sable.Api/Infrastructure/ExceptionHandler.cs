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

        var fallback = Errors.Server();
        await ProblemDetailsWriter.WriteAsync(httpContext, fallback.Status, fallback.Code, fallback.Message);
        return true;
    }
}
