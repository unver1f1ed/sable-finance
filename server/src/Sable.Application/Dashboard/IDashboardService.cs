namespace Sable.Application.Dashboard;

public interface IDashboardService
{
    Task<DashboardDto> GetAsync(string? month, CancellationToken cancellationToken = default);
}
