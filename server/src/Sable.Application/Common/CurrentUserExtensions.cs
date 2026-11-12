using Sable.Application.Abstractions;

namespace Sable.Application.Common;

public static class CurrentUserExtensions
{
    public static Guid RequireUserId(this ICurrentUser currentUser) =>
        currentUser.UserId ?? throw Errors.Unauthorized();

    public static bool HasUnlimitedPlan(this ICurrentUser currentUser) =>
        PlanLimits.IsUnlimited(currentUser.PlanCode);
}
