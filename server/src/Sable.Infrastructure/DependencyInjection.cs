using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Sable.Application.Abstractions;
using Sable.Infrastructure.Finance;
using Sable.Infrastructure.Identity;

namespace Sable.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var identityConnection = GetConnectionString(configuration, "Identity");
        var financeConnection = GetConnectionString(configuration, "Finance");

        services.AddDbContext<IdentityDbContext>(options => options
            .UseNpgsql(identityConnection, npgsql => npgsql.MigrationsAssembly("Sable.Infrastructure"))
            .UseSnakeCaseNamingConvention());

        services.AddDbContext<FinanceDbContext>(options => options
            .UseNpgsql(financeConnection, npgsql => npgsql.MigrationsAssembly("Sable.Infrastructure"))
            .UseSnakeCaseNamingConvention());

        services.AddScoped<IFinanceDbContext>(sp => sp.GetRequiredService<FinanceDbContext>());
        services.AddScoped<DatabaseInitializer>();

        return services;
    }

    private static string GetConnectionString(IConfiguration configuration, string name) =>
        configuration.GetConnectionString(name)
        ?? throw new InvalidOperationException($"Connection string '{name}' is not configured.");
}
