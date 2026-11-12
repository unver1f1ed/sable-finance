using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Sable.Application.Auth;
using Sable.Infrastructure.Finance;
using Sable.Infrastructure.Identity;

namespace Sable.Infrastructure;

public class DatabaseInitializer(
    IdentityDbContext identityDb,
    FinanceDbContext financeDb,
    RoleManager<IdentityRole<Guid>> roles,
    UserManager<AppUser> users,
    IConfiguration configuration)
{
    public async Task InitializeAsync()
    {
        await identityDb.Database.MigrateAsync();
        await financeDb.Database.MigrateAsync();
        await SeedAsync();
    }

    private async Task SeedAsync()
    {
        await SeedRolesAsync();
        await SeedAdminAsync();
    }

    private async Task SeedRolesAsync()
    {
        foreach (var name in new[] { Roles.User, Roles.Admin })
        {
            if (await roles.RoleExistsAsync(name))
            {
                continue;
            }

            var created = await roles.CreateAsync(new IdentityRole<Guid>(name) { Id = Guid.CreateVersion7() });
            EnsureSucceeded(created, $"create role '{name}'");
        }
    }

    private async Task SeedAdminAsync()
    {
        var email = configuration["Seed:AdminEmail"]?.Trim().ToLowerInvariant();
        var password = configuration["Seed:AdminPassword"];
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
        {
            return;
        }

        if (await users.FindByEmailAsync(email) is not null)
        {
            return;
        }

        var admin = new AppUser
        {
            Id = Guid.CreateVersion7(),
            UserName = email,
            Email = email,
            FirstName = "Адміністратор",
            LastName = "Sable",
            PlanCode = "plus",
            CreatedAt = DateTimeOffset.UtcNow
        };

        EnsureSucceeded(await users.CreateAsync(admin, password), "create the admin user");
        EnsureSucceeded(await users.AddToRolesAsync(admin, [Roles.Admin, Roles.User]), "assign admin roles");
    }

    private static void EnsureSucceeded(IdentityResult result, string action)
    {
        if (!result.Succeeded)
        {
            var details = string.Join("; ", result.Errors.Select(e => e.Code));
            throw new InvalidOperationException($"Seeding failed to {action}: {details}");
        }
    }
}
