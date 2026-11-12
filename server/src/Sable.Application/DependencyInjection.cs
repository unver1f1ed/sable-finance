using Microsoft.Extensions.DependencyInjection;
using Sable.Application.Common;

namespace Sable.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IUserDataEraser, UserDataEraser>();
        return services;
    }
}
