using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Sable.Application.Abstractions;
using Sable.Application.Common;
using Sable.Application.Transactions;
using Sable.Domain.Enums;

namespace Sable.Application.Dashboard;

public class DashboardService(IFinanceDbContext db, TimeProvider timeProvider) : IDashboardService
{
    private const int TopCategories = 4;
    private const int MonthsInSeries = 6;
    private const int RecentCount = 5;
    private const string OtherName = "Інше";
    private const string OtherColor = "#A0A1A8";

    public async Task<DashboardDto> GetAsync(string? month, CancellationToken cancellationToken = default)
    {
        var first = ParseMonth(month);
        var previousFirst = first.AddMonths(-1);
        var lastDay = first.AddMonths(1).AddDays(-1);
        var previousLastDay = first.AddDays(-1);
        var seriesStart = first.AddMonths(1 - MonthsInSeries);

        var monthlyRows = await db.Transactions
            .Where(t => t.OccurredOn >= seriesStart && t.OccurredOn <= lastDay)
            .GroupBy(t => new { t.OccurredOn.Year, t.OccurredOn.Month, t.Type })
            .Select(g => new { g.Key.Year, g.Key.Month, g.Key.Type, Sum = g.Sum(t => t.Amount) })
            .ToListAsync(cancellationToken);

        var monthly = Enumerable.Range(0, MonthsInSeries)
            .Select(i => seriesStart.AddMonths(i))
            .Select(d => new MonthlyPoint(
                FormatMonth(d),
                SumFor(d, TransactionType.Income),
                SumFor(d, TransactionType.Expense)))
            .ToList();

        decimal SumFor(DateOnly d, TransactionType type) => monthlyRows
            .Where(r => r.Year == d.Year && r.Month == d.Month && r.Type == type)
            .Sum(r => r.Sum);

        var initialBalance = await db.Accounts.SumAsync(a => (decimal?)a.InitialBalance, cancellationToken) ?? 0m;
        var balanceRows = await db.Transactions
            .Where(t => t.OccurredOn <= lastDay)
            .GroupBy(t => new { t.Type, AfterPrevious = t.OccurredOn > previousLastDay })
            .Select(g => new { g.Key.Type, g.Key.AfterPrevious, Sum = g.Sum(t => t.Amount) })
            .ToListAsync(cancellationToken);

        decimal Net(bool includeCurrentMonth) => balanceRows
            .Where(r => includeCurrentMonth || !r.AfterPrevious)
            .Sum(r => r.Type == TransactionType.Income ? r.Sum : -r.Sum);

        var current = monthly[^1];
        var previous = monthly[^2];

        var categoryRows = await db.Transactions
            .Where(t => t.Type == TransactionType.Expense && t.OccurredOn >= first && t.OccurredOn <= lastDay)
            .GroupBy(t => new { t.CategoryId, t.Category.Name, t.Category.Color })
            .Select(g => new { g.Key.CategoryId, g.Key.Name, g.Key.Color, Amount = g.Sum(t => t.Amount) })
            .OrderByDescending(x => x.Amount)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        var byCategory = categoryRows
            .Take(TopCategories)
            .Select(c => new CategoryAmount(c.CategoryId, c.Name, c.Color, c.Amount))
            .ToList();
        if (categoryRows.Count > TopCategories)
        {
            byCategory.Add(new CategoryAmount(
                Guid.Empty, OtherName, OtherColor, categoryRows.Skip(TopCategories).Sum(c => c.Amount)));
        }

        var recent = await db.Transactions
            .OrderByDescending(t => t.OccurredOn)
            .ThenByDescending(t => t.CreatedAt)
            .ThenByDescending(t => t.Id)
            .Take(RecentCount)
            .Select(TransactionProjections.ToDto)
            .ToListAsync(cancellationToken);

        return new DashboardDto
        {
            Month = FormatMonth(first),
            TotalBalance = initialBalance + Net(includeCurrentMonth: true),
            Income = current.Income,
            Expense = current.Expense,
            SavedPercent = SavedPercent(current.Income, current.Expense),
            Previous = new MonthSummary(
                initialBalance + Net(includeCurrentMonth: false),
                previous.Income,
                previous.Expense,
                SavedPercent(previous.Income, previous.Expense)),
            Monthly = monthly,
            ByCategory = byCategory,
            Recent = recent
        };
    }

    private DateOnly ParseMonth(string? month)
    {
        if (string.IsNullOrWhiteSpace(month))
        {
            var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
            return new DateOnly(today.Year, today.Month, 1);
        }

        if (month.Length != 7
            || !DateOnly.TryParseExact(month + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            throw Errors.Validation("month", ValidationMessages.InvalidMonth);
        }

        return parsed;
    }

    private static string FormatMonth(DateOnly date) => date.ToString("yyyy-MM", CultureInfo.InvariantCulture);

    private static int SavedPercent(decimal income, decimal expense) =>
        income == 0 ? 0 : (int)Math.Round((income - expense) / income * 100, MidpointRounding.AwayFromZero);
}
