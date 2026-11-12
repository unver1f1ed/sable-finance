using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sable.Application.Abstractions;
using Sable.Application.Admin.Plans;
using Sable.Application.Auth;

namespace Sable.Api.Controllers;

[Route("api/admin")]
[Authorize(Roles = Roles.Admin)]
public class AdminPlansController(IAdminPlanService plans, ICurrentUser currentUser) : ApiControllerBase(currentUser)
{
    [HttpGet("plans")]
    public async Task<ActionResult<IReadOnlyList<AdminPlanDto>>> ListPlans(CancellationToken ct) =>
        Ok(await plans.ListPlansAsync(ct));

    [HttpPut("plans/{id:guid}")]
    public async Task<ActionResult<AdminPlanDto>> UpdatePlan(Guid id, AdminPlanInput input, CancellationToken ct) =>
        await plans.UpdatePlanAsync(id, input, ct);

    [HttpGet("plan-features")]
    public async Task<ActionResult<IReadOnlyList<AdminFeatureDto>>> ListFeatures(CancellationToken ct) =>
        Ok(await plans.ListFeaturesAsync(ct));

    [HttpPost("plan-features")]
    public async Task<ActionResult<AdminFeatureDto>> CreateFeature(AdminFeatureInput input, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await plans.CreateFeatureAsync(input, ct));

    [HttpPut("plan-features/order")]
    public async Task<IActionResult> Reorder(FeatureOrderInput input, CancellationToken ct)
    {
        await plans.ReorderFeaturesAsync(input, ct);
        return NoContent();
    }

    [HttpPut("plan-features/{id:guid}")]
    public async Task<ActionResult<AdminFeatureDto>> UpdateFeature(Guid id, AdminFeatureInput input, CancellationToken ct) =>
        await plans.UpdateFeatureAsync(id, input, ct);

    [HttpDelete("plan-features/{id:guid}")]
    public async Task<IActionResult> DeleteFeature(Guid id, CancellationToken ct)
    {
        await plans.DeleteFeatureAsync(id, ct);
        return NoContent();
    }
}
