using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Sable.Application.Accounts;
using Sable.Application.Categories;
using Sable.Application.Budgets;
using Sable.Application.Common;
using Sable.Application.Dashboard;
using Sable.Application.Goals;
using Sable.Application.Transactions;

namespace Sable.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.TryAddSingleton(TimeProvider.System);
        services.AddScoped<IUserDataEraser, UserDataEraser>();
        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ITransactionService, TransactionService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IBudgetService, BudgetService>();
        services.AddScoped<IGoalService, GoalService>();
        return services;
    }
}
