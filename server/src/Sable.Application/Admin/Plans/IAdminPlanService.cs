namespace Sable.Application.Admin.Plans;

public interface IAdminPlanService
{
    Task<IReadOnlyList<AdminPlanDto>> ListPlansAsync(CancellationToken cancellationToken = default);
    Task<AdminPlanDto> UpdatePlanAsync(Guid id, AdminPlanInput input, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AdminFeatureDto>> ListFeaturesAsync(CancellationToken cancellationToken = default);
    Task<AdminFeatureDto> CreateFeatureAsync(AdminFeatureInput input, CancellationToken cancellationToken = default);
    Task<AdminFeatureDto> UpdateFeatureAsync(Guid id, AdminFeatureInput input, CancellationToken cancellationToken = default);
    Task DeleteFeatureAsync(Guid id, CancellationToken cancellationToken = default);
    Task ReorderFeaturesAsync(FeatureOrderInput input, CancellationToken cancellationToken = default);
}
