using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Sable.Infrastructure;
using Sable.Infrastructure.Finance;
using Sable.Infrastructure.Finance.Seed;
using Sable.Infrastructure.Identity;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Finance;

[Collection(ApiCollection.Name)]
public class DemoUsersTests(ApiFactory factory)
{
    [Fact]
    public async Task Extra_demo_users_have_their_plans_states_and_data()
    {
        using var warmUp = factory.CreateClient();
        await using var scope = factory.Services.CreateAsyncScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var db = scope.ServiceProvider.GetRequiredService<FinanceDbContext>();

        foreach (var profile in DemoUsers.All)
        {
            var user = await users.FindByEmailAsync(profile.Email);
            Assert.NotNull(user);
            Assert.Equal(profile.PlanCode, user.PlanCode);
            Assert.Equal(["User"], await users.GetRolesAsync(user));
            Assert.Equal(profile.IsBlocked, await users.IsLockedOutAsync(user));

            var transactions = await db.Transactions.IgnoreQueryFilters().Where(t => t.UserId == user.Id).ToListAsync();
            if (profile.Months == 0)
            {
                Assert.Empty(transactions);
                continue;
            }

            Assert.NotEmpty(transactions);
            Assert.All(transactions, t => Assert.True(t.OccurredOn <= FinanceClientExtensions.Today));
        }
    }

    [Fact]
    public async Task Running_the_initializer_again_does_not_duplicate_the_extra_demo_users()
    {
        using var warmUp = factory.CreateClient();
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FinanceDbContext>();
        var before = await db.Transactions.IgnoreQueryFilters().CountAsync();

        await scope.ServiceProvider.GetRequiredService<DatabaseInitializer>().InitializeAsync();

        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        foreach (var profile in DemoUsers.All)
        {
            Assert.Equal(1, await users.Users.CountAsync(u => u.Email == profile.Email));
        }

        Assert.Equal(before, await db.Transactions.IgnoreQueryFilters().CountAsync());
    }
}
