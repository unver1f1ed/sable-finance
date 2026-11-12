using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Sable.Infrastructure;
using Sable.Infrastructure.Finance;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Finance;

[Collection(ApiCollection.Name)]
public class SeedTests(ApiFactory factory)
{
    [Fact]
    public async Task Running_the_initializer_again_does_not_duplicate_system_categories()
    {
        using var client = factory.CreateClient();

        for (var run = 0; run < 2; run++)
        {
            await using var scope = factory.Services.CreateAsyncScope();
            await scope.ServiceProvider.GetRequiredService<DatabaseInitializer>().InitializeAsync();
        }

        await using var checkScope = factory.Services.CreateAsyncScope();
        var db = checkScope.ServiceProvider.GetRequiredService<FinanceDbContext>();
        var system = await db.Categories.IgnoreQueryFilters().Where(c => c.UserId == null).ToListAsync();

        Assert.Equal(12, system.Count);
        Assert.Equal(12, system.Select(c => (c.Name, c.Type)).Distinct().Count());
        Assert.Single(system, c => c.IsGoalContribution);
    }
}
