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
        var ct = context.RequestAborted;

        if (await CanConnectAsync(identityDb, logger, ct) && await CanConnectAsync(financeDb, logger, ct))
        {
            return Results.Ok(new { status = "ok" });
        }

        var error = Errors.Server("Сервіс тимчасово недоступний. Спробуйте пізніше");
        await ProblemDetailsWriter.WriteAsync(context, StatusCodes.Status503ServiceUnavailable, error.Code, error.Message);
        return Results.Empty;
    }

    private static async Task<bool> CanConnectAsync(
        Microsoft.EntityFrameworkCore.DbContext db,
        ILogger logger,
        CancellationToken ct)
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
