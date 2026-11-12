namespace Sable.Application.Budgets;

public interface IBudgetService
{
    Task<BudgetSummary> GetSummaryAsync(string? month, CancellationToken cancellationToken = default);
    Task<BudgetDto> CreateAsync(BudgetInput input, CancellationToken cancellationToken = default);
    Task<BudgetDto> UpdateAsync(Guid id, BudgetUpdateInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
