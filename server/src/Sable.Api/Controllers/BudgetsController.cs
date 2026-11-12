using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sable.Application.Abstractions;
using Sable.Application.Budgets;

namespace Sable.Api.Controllers;

[Route("api/budgets")]
[Authorize]
public class BudgetsController(IBudgetService budgets, ICurrentUser currentUser) : ApiControllerBase(currentUser)
{
    [HttpGet]
    public async Task<ActionResult<BudgetSummary>> Get([FromQuery] string? month, CancellationToken ct) =>
        await budgets.GetSummaryAsync(month, ct);

    [HttpPost]
    public async Task<ActionResult<BudgetDto>> Create(BudgetInput input, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await budgets.CreateAsync(input, ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<BudgetDto>> Update(Guid id, BudgetUpdateInput input, CancellationToken ct) =>
        await budgets.UpdateAsync(id, input, ct);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await budgets.DeleteAsync(id, ct);
        return NoContent();
    }
}
