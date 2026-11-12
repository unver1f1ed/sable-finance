namespace Sable.Application.Common;

public static class PlanLimits
{
    public const int StartMaxAccounts = 2;
    public const int StartMaxBudgets = 5;
    public const int StartMaxActiveGoals = 1;

    public static bool IsUnlimited(string? planCode) => planCode == PlanCodes.Plus;
}
