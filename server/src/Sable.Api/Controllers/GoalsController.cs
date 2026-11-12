using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sable.Application.Abstractions;
using Sable.Application.Goals;

namespace Sable.Api.Controllers;

[Route("api/goals")]
[Authorize]
public class GoalsController(IGoalService goals, ICurrentUser currentUser) : ApiControllerBase(currentUser)
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<GoalDto>>> List(
        [FromQuery] bool includeArchived,
        CancellationToken ct) =>
        Ok(await goals.ListAsync(includeArchived, ct));

    [HttpPost]
    public async Task<ActionResult<GoalDto>> Create(GoalInput input, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await goals.CreateAsync(input, ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<GoalDto>> Update(Guid id, GoalInput input, CancellationToken ct) =>
        await goals.UpdateAsync(id, input, ct);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await goals.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/archive")]
    public async Task<ActionResult<GoalDto>> Archive(Guid id, CancellationToken ct) =>
        await goals.ArchiveAsync(id, ct);

    [HttpPost("{id:guid}/contributions")]
    public async Task<ActionResult<GoalDto>> Contribute(Guid id, ContributionInput input, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await goals.ContributeAsync(id, input, ct));
}
