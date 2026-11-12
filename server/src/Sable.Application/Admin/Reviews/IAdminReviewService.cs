using Sable.Application.Common;

namespace Sable.Application.Admin.Reviews;

public interface IAdminReviewService
{
    Task<Paged<AdminReviewDto>> ListAsync(AdminReviewQuery query, CancellationToken cancellationToken = default);
    Task<AdminReviewDto> CreateAsync(AdminReviewInput input, CancellationToken cancellationToken = default);
    Task<AdminReviewDto> UpdateAsync(Guid id, AdminReviewInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
