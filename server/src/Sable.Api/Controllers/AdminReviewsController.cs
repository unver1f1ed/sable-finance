using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sable.Application.Abstractions;
using Sable.Application.Admin.Reviews;
using Sable.Application.Auth;
using Sable.Application.Common;

namespace Sable.Api.Controllers;

[Route("api/admin/reviews")]
[Authorize(Roles = Roles.Admin)]
public class AdminReviewsController(IAdminReviewService reviews, ICurrentUser currentUser) : ApiControllerBase(currentUser)
{
    [HttpGet]
    public async Task<ActionResult<Paged<AdminReviewDto>>> List([FromQuery] AdminReviewQuery query, CancellationToken ct) =>
        await reviews.ListAsync(query, ct);

    [HttpPost]
    public async Task<ActionResult<AdminReviewDto>> Create(AdminReviewInput input, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await reviews.CreateAsync(input, ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AdminReviewDto>> Update(Guid id, AdminReviewInput input, CancellationToken ct) =>
        await reviews.UpdateAsync(id, input, ct);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await reviews.DeleteAsync(id, ct);
        return NoContent();
    }
}
