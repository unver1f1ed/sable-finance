using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Sable.Application.Abstractions;
using Sable.Application.Categories;
using Sable.Application.Common;
using Sable.Application.Transactions;
using Sable.Domain.Entities;
using Sable.Domain.Enums;

namespace Sable.Application.Goals;

public class GoalService(IFinanceDbContext db, ICurrentUser currentUser, TimeProvider timeProvider) : IGoalService
{
    private const string PlanLimitMessage =
        "На тарифі Старт доступна 1 активна ціль. Перейдіть на Плюс, щоб додати більше";
    private const string ArchivedEditMessage = "Архівну ціль не можна змінювати";
    private const string ArchivedContributionMessage = "Ціль в архіві. Внески недоступні";
    private const string ContributionPrefix = "Внесок: ";
    private const int MaxDescriptionLength = 120;
    private const int MaxDeadlineYears = 50;

    private sealed record GoalRow(
        Guid Id,
        string Name,
        decimal TargetAmount,
        decimal CurrentAmount,
        DateOnly? Deadline,
        string Icon,
        string Color,
        DateTimeOffset? ArchivedAt,
        DateTimeOffset CreatedAt);

    public async Task<IReadOnlyList<GoalDto>> ListAsync(
        bool includeArchived,
        CancellationToken cancellationToken = default)
    {
        var today = Today();
        var rows = await Rows(g => includeArchived || g.ArchivedAt == null)
            .ToListAsync(cancellationToken);

        return rows
            .OrderBy(Group)
            .ThenByDescending(g => g.CreatedAt)
            .ThenByDescending(g => g.Id)
            .Select(g => ToDto(g, today))
            .ToList();
    }

    public async Task<GoalDto> CreateAsync(GoalInput input, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();
        var today = Today();
        ValidateDeadline(input.Deadline, today);

        if (!currentUser.HasUnlimitedPlan()
            && await CountActiveAsync(cancellationToken) >= PlanLimits.StartMaxActiveGoals)
        {
            throw Errors.PlanLimit(PlanLimitMessage);
        }

        var goal = new Goal
        {
            Id = Guid.CreateVersion7(),
            UserId = userId,
            CreatedAt = timeProvider.GetUtcNow()
        };
        Apply(goal, input);
        db.Goals.Add(goal);
        await db.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(goal.Id, cancellationToken);
    }

    public async Task<GoalDto> UpdateAsync(Guid id, GoalInput input, CancellationToken cancellationToken = default)
    {
        var goal = await db.Goals.FirstOrDefaultAsync(g => g.Id == id, cancellationToken)
            ?? throw Errors.NotFound();
        if (goal.ArchivedAt is not null)
        {
            throw Errors.Conflict(ArchivedEditMessage);
        }

        if (input.Deadline != goal.Deadline)
        {
            ValidateDeadline(input.Deadline, Today());
        }

        Apply(goal, input);
        await db.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var goal = await db.Goals.FirstOrDefaultAsync(g => g.Id == id, cancellationToken)
            ?? throw Errors.NotFound();

        db.Goals.Remove(goal);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<GoalDto> ArchiveAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var goal = await db.Goals.FirstOrDefaultAsync(g => g.Id == id, cancellationToken)
            ?? throw Errors.NotFound();

        if (goal.ArchivedAt is null)
        {
            goal.ArchivedAt = timeProvider.GetUtcNow();
            await db.SaveChangesAsync(cancellationToken);
        }

        return await GetDtoAsync(id, cancellationToken);
    }

    public async Task<GoalDto> ContributeAsync(
        Guid id,
        ContributionInput input,
        CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        var goal = await Rows(g => g.Id == id).FirstOrDefaultAsync(cancellationToken)
            ?? throw Errors.NotFound();
        if (goal.ArchivedAt is not null)
        {
            throw Errors.Conflict(ArchivedContributionMessage);
        }

        var errors = new Dictionary<string, string[]>();
        if (input.Amount > goal.TargetAmount - goal.CurrentAmount)
        {
            errors["amount"] = [ValidationMessages.ContributionExceedsRemaining];
        }

        if (!await db.Accounts.AnyAsync(a => a.Id == input.AccountId, cancellationToken))
        {
            errors["accountId"] = [ValidationMessages.AccountNotFound];
        }

        if (!TransactionRules.IsDateAllowed(input.OccurredOn, Today()))
        {
            errors["occurredOn"] = [ValidationMessages.InvalidDate];
        }

        if (errors.Count > 0)
        {
            throw Errors.Validation(errors);
        }

        var categoryId = await db.Categories
            .Where(c => c.IsGoalContribution && c.UserId == null)
            .Select(c => (Guid?)c.Id)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw Errors.Server();

        var description = ContributionPrefix + goal.Name;
        if (description.Length > MaxDescriptionLength)
        {
            description = description[..MaxDescriptionLength];
        }

        db.Transactions.Add(new Transaction
        {
            Id = Guid.CreateVersion7(),
            UserId = userId,
            AccountId = input.AccountId,
            CategoryId = categoryId,
            GoalId = id,
            Type = TransactionType.Expense,
            Amount = input.Amount,
            OccurredOn = input.OccurredOn,
            Description = description,
            Note = null,
            CreatedAt = timeProvider.GetUtcNow()
        });
        await db.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(id, cancellationToken);
    }

    private static int Group(GoalRow goal) =>
        goal.ArchivedAt is not null ? 2 : goal.CurrentAmount >= goal.TargetAmount ? 1 : 0;

    private DateOnly Today() => DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);

    private static void ValidateDeadline(DateOnly? deadline, DateOnly today)
    {
        if (deadline is { } value && (value < today || value > today.AddYears(MaxDeadlineYears)))
        {
            throw Errors.Validation("deadline", ValidationMessages.DeadlineInFuture);
        }
    }

    private static void Apply(Goal goal, GoalInput input)
    {
        goal.Name = input.Name.Trim();
        goal.TargetAmount = input.TargetAmount;
        goal.Deadline = input.Deadline;
        goal.Icon = input.Icon;
        goal.Color = CategoryPalette.NormalizeColor(input.Color);
    }

    private Task<int> CountActiveAsync(CancellationToken cancellationToken) =>
        db.Goals.CountAsync(
            g => g.ArchivedAt == null && (g.Transactions.Sum(t => (decimal?)t.Amount) ?? 0m) < g.TargetAmount,
            cancellationToken);

    private IQueryable<GoalRow> Rows(Expression<Func<Goal, bool>> predicate) => db.Goals.Where(predicate).Select(g => new GoalRow(
        g.Id,
        g.Name,
        g.TargetAmount,
        g.Transactions.Sum(t => (decimal?)t.Amount) ?? 0m,
        g.Deadline,
        g.Icon,
        g.Color,
        g.ArchivedAt,
        g.CreatedAt));

    private async Task<GoalDto> GetDtoAsync(Guid id, CancellationToken cancellationToken)
    {
        var row = await Rows(g => g.Id == id).SingleAsync(cancellationToken);
        return ToDto(row, Today());
    }

    private static GoalDto ToDto(GoalRow goal, DateOnly today)
    {
        var achieved = goal.CurrentAmount >= goal.TargetAmount;
        var archived = goal.ArchivedAt is not null;

        return new GoalDto
        {
            Id = goal.Id,
            Name = goal.Name,
            TargetAmount = goal.TargetAmount,
            CurrentAmount = goal.CurrentAmount,
            Deadline = goal.Deadline,
            Icon = goal.Icon,
            Color = goal.Color,
            IsAchieved = achieved,
            IsArchived = archived,
            MonthlyNeeded = achieved || archived ? null : MonthlyNeeded(goal, today)
        };
    }

    private static long? MonthlyNeeded(GoalRow goal, DateOnly today)
    {
        if (goal.Deadline is not { } deadline)
        {
            return null;
        }

        var months = (deadline.Year - today.Year) * 12 + deadline.Month - today.Month;
        if (deadline.Day < today.Day)
        {
            months--;
        }

        months = Math.Max(months, 1);
        return (long)Math.Ceiling((goal.TargetAmount - goal.CurrentAmount) / months);
    }
}
