using Microsoft.EntityFrameworkCore;
using Sable.Application.Abstractions;

namespace Sable.Application.Common;

public class UserDataEraser(IFinanceDbContext db) : IUserDataEraser
{
    public async Task EraseAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await db.Transactions.IgnoreQueryFilters()
            .Where(e => e.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Budgets.IgnoreQueryFilters()
            .Where(e => e.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Goals.IgnoreQueryFilters()
            .Where(e => e.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Accounts.IgnoreQueryFilters()
            .Where(e => e.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Categories.IgnoreQueryFilters()
            .Where(e => e.UserId == userId).ExecuteDeleteAsync(cancellationToken);
    }
}
