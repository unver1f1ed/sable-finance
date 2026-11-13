using Microsoft.EntityFrameworkCore;
using Sable.Application.Common;
using Sable.Infrastructure.Finance;
using Sable.Infrastructure.Identity;

namespace Sable.Api.Infrastructure;

public static class HealthEndpoint
{
    public static async Task<IResult> HandleAsync(
        HttpContext context,
        IdentityDbContext identityDb,
        FinanceDbContext financeDb,
        ILogger<IdentityDbContext> logger)
    {
        context.Response.Headers.CacheControl = "no-store";
        var ct = context.RequestAborted;

        if (await CanConnectAsync(identityDb, logger, ct) && await CanConnectAsync(financeDb, logger, ct))
        {
            return Results.Ok(new { status = "ok" });
        }

        await ProblemDetailsWriter.WriteAsync(
            context, StatusCodes.Status503ServiceUnavailable, "server_error", ErrorDetails.ServiceUnavailable);
        return Results.Empty;
    }

    private static async Task<bool> CanConnectAsync(DbContext db, ILogger logger, CancellationToken ct)
    {
        try
        {
            return await db.Database.CanConnectAsync(ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Health check could not reach {Context}", db.GetType().Name);
            return false;
        }
    }
}
