using Sable.Application.Common;

namespace Sable.Application.Admin.Users;

public interface IUserAdminService
{
    Task<Paged<AdminUserDto>> ListAsync(AdminUserQuery query, CancellationToken cancellationToken = default);
    Task<AdminUserStats> GetStatsAsync(CancellationToken cancellationToken = default);
    Task<AdminUserDto> UpdateAsync(Guid id, AdminUserInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyDictionary<string, int>> CountUsersByPlanAsync(CancellationToken cancellationToken = default);
}
