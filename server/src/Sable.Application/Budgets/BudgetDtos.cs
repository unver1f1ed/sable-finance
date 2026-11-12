using Sable.Application.Common;
using Sable.Application.Transactions;

namespace Sable.Application.Budgets;

public sealed record BudgetDto
{
    public Guid Id { get; init; }
    public CategoryRef Category { get; init; } = null!;
    public decimal LimitAmount { get; init; }
    public decimal Spent { get; init; }
    public string Month { get; init; } = string.Empty;
}

public sealed record BudgetInput
{
    public Guid CategoryId { get; init; }

    [MoneyAmount]
    [MaxDecimals(2)]
    public decimal LimitAmount { get; init; }
}

public sealed record BudgetUpdateInput
{
    [MoneyAmount]
    [MaxDecimals(2)]
    public decimal LimitAmount { get; init; }
}

public sealed record BudgetSummary
{
    public string Month { get; init; } = string.Empty;
    public decimal TotalLimit { get; init; }
    public decimal TotalSpent { get; init; }
    public int DaysLeft { get; init; }
    public decimal PerDayLeft { get; init; }
    public IReadOnlyList<BudgetDto> Items { get; init; } = [];
}
