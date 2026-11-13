using Microsoft.EntityFrameworkCore;
using Sable.Application.Abstractions;
using Sable.Application.Common;
using Sable.Application.Transactions;
using Sable.Domain.Entities;
using Sable.Domain.Enums;

namespace Sable.Application.Budgets;

public class BudgetService(IFinanceDbContext db, ICurrentUser currentUser, TimeProvider timeProvider) : IBudgetService
{
    private const string PlanLimitMessage =
        "На тарифі Старт доступно до 5 бюджетів. Перейдіть на Плюс, щоб додати більше";
    private const string DuplicateMessage = "Для цієї категорії вже є бюджет";

    public async Task<BudgetSummary> GetSummaryAsync(string? month, CancellationToken cancellationToken = default)
    {
        var today = Today();
        var first = MonthParser.Parse(month, today);

        var items = await Query(first).ToListAsync(cancellationToken);

        var totalLimit = items.Sum(i => i.LimitAmount);
        var totalSpent = items.Sum(i => i.Spent);
        var daysLeft = DaysLeft(first, today);
        var perDay = Math.Round(
            Math.Max(totalLimit - totalSpent, 0) / Math.Max(daysLeft, 1),
            0,
            MidpointRounding.AwayFromZero);

        return new BudgetSummary
        {
            Month = MonthParser.Format(first),
            TotalLimit = totalLimit,
            TotalSpent = totalSpent,
            DaysLeft = daysLeft,
            PerDayLeft = perDay,
            Items = items
        };
    }

    public async Task<BudgetDto> CreateAsync(BudgetInput input, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        var category = await db.Categories
            .Where(c => c.Id == input.CategoryId)
            .Select(c => new { c.Type, c.IsGoalContribution })
            .FirstOrDefaultAsync(cancellationToken);
        if (category is null)
        {
            throw Errors.Validation("categoryId", ValidationMessages.CategoryNotFound);
        }

        if (category.Type != TransactionType.Expense || category.IsGoalContribution)
        {
            throw Errors.Validation("categoryId", ValidationMessages.BudgetCategoryNotExpense);
        }

        if (!currentUser.HasUnlimitedPlan()
            && await db.Budgets.CountAsync(cancellationToken) >= PlanLimits.StartMaxBudgets)
        {
            throw Errors.PlanLimit(PlanLimitMessage);
        }

        if (await db.Budgets.AnyAsync(b => b.CategoryId == input.CategoryId, cancellationToken))
        {
            throw Errors.Conflict(DuplicateMessage);
        }

        var budget = new Budget
        {
            Id = Guid.CreateVersion7(),
            UserId = userId,
            CategoryId = input.CategoryId,
            LimitAmount = input.LimitAmount,
            CreatedAt = timeProvider.GetUtcNow()
        };
        db.Budgets.Add(budget);
        await db.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(budget.Id, cancellationToken);
    }

    public async Task<BudgetDto> UpdateAsync(
        Guid id,
        BudgetUpdateInput input,
        CancellationToken cancellationToken = default)
    {
        var budget = await db.Budgets.FirstOrDefaultAsync(b => b.Id == id, cancellationToken)
            ?? throw Errors.NotFound();

        budget.LimitAmount = input.LimitAmount;
        await db.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var budget = await db.Budgets.FirstOrDefaultAsync(b => b.Id == id, cancellationToken)
            ?? throw Errors.NotFound();

        db.Budgets.Remove(budget);
        await db.SaveChangesAsync(cancellationToken);
    }

    private DateOnly Today() => DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);

    private static int DaysLeft(DateOnly firstOfMonth, DateOnly today)
    {
        var currentMonth = new DateOnly(today.Year, today.Month, 1);
        if (firstOfMonth < currentMonth)
        {
            return 0;
        }

        var daysInMonth = DateTime.DaysInMonth(firstOfMonth.Year, firstOfMonth.Month);
        return firstOfMonth > currentMonth ? daysInMonth : daysInMonth - today.Day + 1;
    }

    private IQueryable<BudgetDto> Query(DateOnly firstOfMonth)
    {
        var last = firstOfMonth.AddMonths(1).AddDays(-1);
        var month = MonthParser.Format(firstOfMonth);

        return db.Budgets
            .OrderBy(b => b.Category.Name)
            .ThenBy(b => b.Id)
            .Select(b => new BudgetDto
            {
                Id = b.Id,
                Category = new CategoryRef(b.CategoryId, b.Category.Name, b.Category.Icon, b.Category.Color),
                LimitAmount = b.LimitAmount,
                Spent = db.Transactions
                .Where(t => t.CategoryId == b.CategoryId
                    && t.Type == TransactionType.Expense
                    && t.OccurredOn >= firstOfMonth
                    && t.OccurredOn <= last)
                .Sum(t => (decimal?)t.Amount) ?? 0m,
                Month = month
            });
    }

    private async Task<BudgetDto> GetDtoAsync(Guid id, CancellationToken cancellationToken)
    {
        var today = Today();
        var first = new DateOnly(today.Year, today.Month, 1);
        return await Query(first).SingleAsync(b => b.Id == id, cancellationToken);
    }
}
