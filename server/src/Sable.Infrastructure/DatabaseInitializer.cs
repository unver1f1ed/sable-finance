using Microsoft.EntityFrameworkCore;
using Sable.Infrastructure.Finance;
using Sable.Infrastructure.Identity;

namespace Sable.Infrastructure;

public class DatabaseInitializer(IdentityDbContext identityDb, FinanceDbContext financeDb)
{
    public async Task InitializeAsync()
    {
        await identityDb.Database.MigrateAsync();
        await financeDb.Database.MigrateAsync();
        await SeedAsync();
    }

    private Task SeedAsync() => Task.CompletedTask;
}
