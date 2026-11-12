using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sable.Application.Abstractions;
using Sable.Application.Admin.Users;
using Sable.Application.Auth;
using Sable.Application.Common;

namespace Sable.Api.Controllers;

[Route("api/admin/users")]
[Authorize(Roles = Roles.Admin)]
public class AdminUsersController(IUserAdminService admin, ICurrentUser currentUser) : ApiControllerBase(currentUser)
{
    [HttpGet]
    public async Task<ActionResult<Paged<AdminUserDto>>> List([FromQuery] AdminUserQuery query, CancellationToken ct) =>
        await admin.ListAsync(query, ct);

    [HttpGet("stats")]
    public async Task<ActionResult<AdminUserStats>> Stats(CancellationToken ct) =>
        await admin.GetStatsAsync(ct);

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AdminUserDto>> Update(Guid id, AdminUserInput input, CancellationToken ct) =>
        await admin.UpdateAsync(id, input, ct);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await admin.DeleteAsync(id, ct);
        return NoContent();
    }
}
