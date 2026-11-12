namespace Sable.Application.Common;

public static class PlanCodes
{
    public const string Start = "start";
    public const string Plus = "plus";

    public static bool IsValid(string? code) => code is Start or Plus;
}
