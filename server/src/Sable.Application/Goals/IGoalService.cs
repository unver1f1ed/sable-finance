namespace Sable.Application.Goals;

public interface IGoalService
{
    Task<IReadOnlyList<GoalDto>> ListAsync(bool includeArchived, CancellationToken cancellationToken = default);
    Task<GoalDto> CreateAsync(GoalInput input, CancellationToken cancellationToken = default);
    Task<GoalDto> UpdateAsync(Guid id, GoalInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<GoalDto> ArchiveAsync(Guid id, CancellationToken cancellationToken = default);
    Task<GoalDto> ContributeAsync(Guid id, ContributionInput input, CancellationToken cancellationToken = default);
}
