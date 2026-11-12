using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Sable.Application.Abstractions;
using Sable.Application.Admin.Users;
using Sable.Application.Auth;
using Sable.Application.Common;

namespace Sable.Infrastructure.Identity;

internal sealed class UserAdminService(
    UserManager<AppUser> users,
    IdentityDbContext identityDb,
    IFinanceDbContext finance,
    ICurrentUser currentUser,
    IUserDataEraser eraser,
    TokenService tokens,
    TimeProvider timeProvider) : IUserAdminService
{
    private const string SelfActionMessage = "Не можна заблокувати, понизити чи видалити власний обліковий запис";
    private const string UnknownPlanMessage = "Оберіть тариф зі списку";

    private static readonly string[] SortValues = ["created_desc", "created_asc", "name_asc"];
    private static readonly string[] StatusValues = ["active", "blocked"];
    private static readonly string[] RoleValues = [Roles.User, Roles.Admin];

    public async Task<Paged<AdminUserDto>> ListAsync(AdminUserQuery query, CancellationToken cancellationToken = default)
    {
        var sort = await ValidateQueryAsync(query, cancellationToken);
        var now = timeProvider.GetUtcNow();
        var adminRoleId = await AdminRoleIdAsync(cancellationToken);

        var filtered = identityDb.Users.AsQueryable();

        var search = query.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
        {
            var lowered = search.ToLower();
            filtered = filtered.Where(u =>
                u.Email!.ToLower().Contains(lowered)
                || u.FirstName.ToLower().Contains(lowered)
                || u.LastName.ToLower().Contains(lowered));
        }

        if (!string.IsNullOrEmpty(query.PlanCode))
        {
            filtered = filtered.Where(u => u.PlanCode == query.PlanCode);
        }

        if (query.Status == "blocked")
        {
            filtered = filtered.Where(u => u.LockoutEnd > now);
        }
        else if (query.Status == "active")
        {
            filtered = filtered.Where(u => u.LockoutEnd == null || u.LockoutEnd <= now);
        }

        if (query.Role == Roles.Admin)
        {
            filtered = filtered.Where(u => identityDb.UserRoles.Any(r => r.UserId == u.Id && r.RoleId == adminRoleId));
        }
        else if (query.Role == Roles.User)
        {
            filtered = filtered.Where(u => !identityDb.UserRoles.Any(r => r.UserId == u.Id && r.RoleId == adminRoleId));
        }

        var total = await filtered.CountAsync(cancellationToken);

        var ordered = sort switch
        {
            "created_asc" => filtered.OrderBy(u => u.CreatedAt).ThenBy(u => u.Id),
            "name_asc" => filtered.OrderBy(u => u.LastName).ThenBy(u => u.FirstName).ThenBy(u => u.Id),
            _ => filtered.OrderByDescending(u => u.CreatedAt).ThenByDescending(u => u.Id)
        };

        var page = new PageRequest(query.Page, query.PageSize);
        var rows = await ordered
            .Skip(page.Skip)
            .Take(page.PageSize)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.PlanCode,
                u.CreatedAt,
                u.LockoutEnd,
                IsAdmin = identityDb.UserRoles.Any(r => r.UserId == u.Id && r.RoleId == adminRoleId)
            })
            .ToListAsync(cancellationToken);

        var counts = await TransactionCountsAsync(rows.Select(r => r.Id).ToList(), cancellationToken);

        return new Paged<AdminUserDto>
        {
            Items = rows
                .Select(r => new AdminUserDto
                {
                    Id = r.Id,
                    Email = r.Email ?? string.Empty,
                    FirstName = r.FirstName,
                    LastName = r.LastName,
                    Role = r.IsAdmin ? Roles.Admin : Roles.User,
                    PlanCode = r.PlanCode,
                    IsBlocked = r.LockoutEnd > now,
                    CreatedAt = r.CreatedAt.UtcDateTime,
                    TransactionCount = counts.GetValueOrDefault(r.Id)
                })
                .ToList(),
            Total = total,
            Page = page.Page,
            PageSize = page.PageSize
        };
    }

    public async Task<AdminUserStats> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var now = timeProvider.GetUtcNow();
        var firstOfMonth = new DateOnly(now.Year, now.Month, 1);
        var firstOfNext = firstOfMonth.AddMonths(1);

        var total = await identityDb.Users.CountAsync(cancellationToken);
        var onPlus = await identityDb.Users.CountAsync(u => u.PlanCode == PlanCodes.Plus, cancellationToken);
        var blocked = await identityDb.Users.CountAsync(u => u.LockoutEnd > now, cancellationToken);

        var active = await finance.Transactions.IgnoreQueryFilters()
            .Where(t => t.OccurredOn >= firstOfMonth && t.OccurredOn < firstOfNext)
            .Select(t => t.UserId)
            .Distinct()
            .CountAsync(cancellationToken);

        return new AdminUserStats(total, active, onPlus, blocked);
    }

    public async Task<AdminUserDto> UpdateAsync(
        Guid id,
        AdminUserInput input,
        CancellationToken cancellationToken = default)
    {
        var user = await users.FindByIdAsync(id.ToString()) ?? throw Errors.NotFound();

        if (!await finance.Plans.AnyAsync(p => p.Code == input.PlanCode, cancellationToken))
        {
            throw Errors.Validation("planCode", UnknownPlanMessage);
        }

        var wantsAdmin = input.Role == Roles.Admin;
        if (currentUser.UserId == id && (input.IsBlocked || !wantsAdmin))
        {
            throw Errors.Conflict(SelfActionMessage);
        }

        user.FirstName = input.FirstName.Trim();
        user.LastName = input.LastName.Trim();
        user.PlanCode = input.PlanCode;
        EnsureSucceeded(await users.UpdateAsync(user));

        if (!await users.IsInRoleAsync(user, Roles.User))
        {
            EnsureSucceeded(await users.AddToRoleAsync(user, Roles.User));
        }

        var isAdmin = await users.IsInRoleAsync(user, Roles.Admin);
        if (wantsAdmin && !isAdmin)
        {
            EnsureSucceeded(await users.AddToRoleAsync(user, Roles.Admin));
        }
        else if (!wantsAdmin && isAdmin)
        {
            EnsureSucceeded(await users.RemoveFromRoleAsync(user, Roles.Admin));
        }

        if (input.IsBlocked)
        {
            EnsureSucceeded(await users.SetLockoutEnabledAsync(user, true));
            EnsureSucceeded(await users.SetLockoutEndDateAsync(user, DateTimeOffset.MaxValue));
            await tokens.RevokeAllAsync(user.Id);
        }
        else
        {
            EnsureSucceeded(await users.SetLockoutEndDateAsync(user, null));
        }

        var counts = await TransactionCountsAsync([id], cancellationToken);
        return new AdminUserDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = wantsAdmin ? Roles.Admin : Roles.User,
            PlanCode = user.PlanCode,
            IsBlocked = input.IsBlocked,
            CreatedAt = user.CreatedAt.UtcDateTime,
            TransactionCount = counts.GetValueOrDefault(id)
        };
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await users.FindByIdAsync(id.ToString()) ?? throw Errors.NotFound();

        if (currentUser.UserId == id)
        {
            throw Errors.Conflict(SelfActionMessage);
        }

        await eraser.EraseAsync(id, cancellationToken);
        EnsureSucceeded(await users.DeleteAsync(user));
    }

    public async Task<IReadOnlyDictionary<string, int>> CountUsersByPlanAsync(
        CancellationToken cancellationToken = default) =>
        await identityDb.Users
            .GroupBy(u => u.PlanCode)
            .Select(g => new { PlanCode = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PlanCode, x => x.Count, cancellationToken);

    private async Task<string> ValidateQueryAsync(AdminUserQuery query, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();

        if (!string.IsNullOrEmpty(query.Role) && !RoleValues.Contains(query.Role))
        {
            errors["role"] = [ValidationMessages.ChooseFromList];
        }

        if (!string.IsNullOrEmpty(query.Status) && !StatusValues.Contains(query.Status))
        {
            errors["status"] = [ValidationMessages.ChooseFromList];
        }

        var sort = string.IsNullOrWhiteSpace(query.Sort) ? "created_desc" : query.Sort.Trim().ToLowerInvariant();
        if (!SortValues.Contains(sort))
        {
            errors["sort"] = [ValidationMessages.UnknownSort];
        }

        if (!string.IsNullOrEmpty(query.PlanCode)
            && !await finance.Plans.AnyAsync(p => p.Code == query.PlanCode, cancellationToken))
        {
            errors["planCode"] = [UnknownPlanMessage];
        }

        PageRequest.Validate(query.Page, query.PageSize, errors);

        if (errors.Count > 0)
        {
            throw Errors.Validation(errors);
        }

        return sort;
    }

    private Task<Guid> AdminRoleIdAsync(CancellationToken cancellationToken) =>
        identityDb.Roles
            .Where(r => r.Name == Roles.Admin)
            .Select(r => r.Id)
            .FirstOrDefaultAsync(cancellationToken);

    /// <summary>The finance data lives in another database, so the counts are read separately and merged in memory.</summary>
    private async Task<Dictionary<Guid, int>> TransactionCountsAsync(
        IReadOnlyCollection<Guid> userIds,
        CancellationToken cancellationToken) =>
        await finance.Transactions.IgnoreQueryFilters()
            .Where(t => userIds.Contains(t.UserId))
            .GroupBy(t => t.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count, cancellationToken);

    private static void EnsureSucceeded(IdentityResult result)
    {
        if (!result.Succeeded)
        {
            throw Errors.Server();
        }
    }
}
