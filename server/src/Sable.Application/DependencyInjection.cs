using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Sable.Application.Accounts;
using Sable.Application.Common;

namespace Sable.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.TryAddSingleton(TimeProvider.System);
        services.AddScoped<IUserDataEraser, UserDataEraser>();
        services.AddScoped<IAccountService, AccountService>();
        return services;
    }
}
