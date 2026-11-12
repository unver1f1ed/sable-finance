using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sable.Application.Abstractions;
using Sable.Application.Auth;

namespace Sable.Api.Controllers;

[Route("api/me")]
[Authorize]
public class MeController(IAuthService auth, ICurrentUser currentUser) : ApiControllerBase(currentUser)
{
    [HttpGet]
    public async Task<ActionResult<UserDto>> Get(CancellationToken ct) =>
        await auth.GetMeAsync(UserId, ct);

    [HttpPut]
    public async Task<ActionResult<UserDto>> Update(UpdateProfileRequest request, CancellationToken ct) =>
        await auth.UpdateProfileAsync(UserId, request, ct);

    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct)
    {
        await auth.ChangePasswordAsync(UserId, request, ct);
        return NoContent();
    }

    [HttpPut("plan")]
    public async Task<ActionResult<AuthResponse>> ChangePlan(ChangePlanRequest request, CancellationToken ct) =>
        await auth.ChangePlanAsync(UserId, request, ct);

    [HttpDelete]
    public async Task<IActionResult> Delete(DeleteAccountRequest request, CancellationToken ct)
    {
        await auth.DeleteAccountAsync(UserId, request, ct);
        return NoContent();
    }
}
