using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Sable.Api.Infrastructure;
using Sable.Application.Abstractions;
using Sable.Application.Auth;

namespace Sable.Api.Controllers;

[Route("api/auth")]
[AllowAnonymous]
public class AuthController(IAuthService auth, ICurrentUser currentUser) : ApiControllerBase(currentUser)
{
    [EnableRateLimiting(RateLimiting.AuthPolicy)]
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken ct)
    {
        var response = await auth.RegisterAsync(request, ct);
        return StatusCode(StatusCodes.Status201Created, response);
    }

    [EnableRateLimiting(RateLimiting.AuthPolicy)]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken ct) =>
        await auth.LoginAsync(request, ct);

    [EnableRateLimiting(RateLimiting.AuthPolicy)]
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request, CancellationToken ct) =>
        await auth.RefreshAsync(request, ct);

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(LogoutRequest request, CancellationToken ct)
    {
        await auth.LogoutAsync(request, ct);
        return NoContent();
    }
}
