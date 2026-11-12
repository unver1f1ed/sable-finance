using Sable.Application.Transactions;

namespace Sable.Application.Dashboard;

public sealed record MonthSummary(decimal TotalBalance, decimal Income, decimal Expense, int SavedPercent);

public sealed record MonthlyPoint(string Month, decimal Income, decimal Expense);

public sealed record CategoryAmount(Guid CategoryId, string Name, string Color, decimal Amount);

public sealed record DashboardDto
{
    public string Month { get; init; } = string.Empty;
    public decimal TotalBalance { get; init; }
    public decimal Income { get; init; }
    public decimal Expense { get; init; }
    public int SavedPercent { get; init; }
    public MonthSummary Previous { get; init; } = null!;
    public IReadOnlyList<MonthlyPoint> Monthly { get; init; } = [];
    public IReadOnlyList<CategoryAmount> ByCategory { get; init; } = [];
    public IReadOnlyList<TransactionDto> Recent { get; init; } = [];
}
