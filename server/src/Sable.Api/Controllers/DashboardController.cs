using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sable.Application.Abstractions;
using Sable.Application.Dashboard;

namespace Sable.Api.Controllers;

[Route("api/dashboard")]
[Authorize]
public class DashboardController(IDashboardService dashboard, ICurrentUser currentUser) : ApiControllerBase(currentUser)
{
    [HttpGet]
    public async Task<ActionResult<DashboardDto>> Get([FromQuery] string? month, CancellationToken ct) =>
        await dashboard.GetAsync(month, ct);
}
