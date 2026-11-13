using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Sable.Application.Abstractions;
using Sable.Application.Auth;
using Sable.Application.Common;

namespace Sable.Infrastructure.Identity;

internal sealed class AuthService(
    UserManager<AppUser> users,
    TokenService tokens,
    IUserDataEraser eraser,
    IFinanceDbContext db)
    : IAuthService
{
    private const string WrongCurrentPasswordMessage = "Неправильний поточний пароль";
    private const string WrongPasswordMessage = "Неправильний пароль";
    private const string InvalidValueMessage = "Некоректне значення";

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        if (!await IsPublishedPlanAsync(request.PlanCode))
        {
            throw Errors.Validation("planCode", ValidationMessages.InvalidPlan);
        }

        var email = NormalizeEmail(request.Email);
        if (await users.FindByEmailAsync(email) is not null)
        {
            throw Errors.EmailTaken();
        }

        var user = new AppUser
        {
            Id = Guid.CreateVersion7(),
            UserName = email,
            Email = email,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            PlanCode = request.PlanCode,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var created = await users.CreateAsync(user, request.Password);
        if (!created.Succeeded)
        {
            throw MapIdentityErrors(created, "password");
        }

        var roleAdded = await users.AddToRoleAsync(user, Roles.User);
        if (!roleAdded.Succeeded)
        {
            await users.DeleteAsync(user);
            throw Errors.Server();
        }

        return await IssueAsync(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await users.FindByEmailAsync(NormalizeEmail(request.Email));
        if (user is null)
        {
            // Hash anyway so the response time does not reveal whether the email is registered.
            users.PasswordHasher.HashPassword(new AppUser(), request.Password);
            throw Errors.InvalidCredentials();
        }

        if (!await users.CheckPasswordAsync(user, request.Password))
        {
            throw Errors.InvalidCredentials();
        }

        if (await users.IsLockedOutAsync(user))
        {
            throw Errors.AccountBlocked();
        }

        return await IssueAsync(user);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken cancellationToken = default)
    {
        var stored = await tokens.FindActiveAsync(request.RefreshToken)
            ?? throw Errors.InvalidRefreshToken();

        var user = await users.FindByIdAsync(stored.UserId.ToString())
            ?? throw Errors.InvalidRefreshToken();

        if (await users.IsLockedOutAsync(user))
        {
            throw Errors.AccountBlocked();
        }

        if (!await tokens.RevokeAsync(stored))
        {
            throw Errors.InvalidRefreshToken();
        }

        return await IssueAsync(user);
    }

    public async Task LogoutAsync(LogoutRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return;
        }

        var stored = await tokens.FindActiveAsync(request.RefreshToken);
        if (stored is not null)
        {
            await tokens.RevokeAsync(stored);
        }
    }

    public async Task<UserDto> GetMeAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await FindUserAsync(userId);
        return await ToDtoAsync(user);
    }

    public async Task<UserDto> UpdateProfileAsync(
        Guid userId,
        UpdateProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await FindUserAsync(userId);

        var email = NormalizeEmail(request.Email);
        var owner = await users.FindByEmailAsync(email);
        if (owner is not null && owner.Id != user.Id)
        {
            throw Errors.EmailTaken();
        }

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.Email = email;
        user.UserName = email;

        var updated = await users.UpdateAsync(user);
        if (!updated.Succeeded)
        {
            throw MapIdentityErrors(updated, "email");
        }

        return await ToDtoAsync(user);
    }

    public async Task ChangePasswordAsync(
        Guid userId,
        ChangePasswordRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await FindUserAsync(userId);

        var changed = await users.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!changed.Succeeded)
        {
            throw changed.Errors.Any(e => e.Code == nameof(IdentityErrorDescriber.PasswordMismatch))
                ? Errors.Validation("currentPassword", WrongCurrentPasswordMessage)
                : MapIdentityErrors(changed, "newPassword");
        }

        await tokens.RevokeAllAsync(user.Id);
    }

    public async Task<AuthResponse> ChangePlanAsync(
        Guid userId,
        ChangePlanRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!await IsPublishedPlanAsync(request.PlanCode))
        {
            throw Errors.Validation("planCode", ValidationMessages.InvalidPlan);
        }

        var user = await FindUserAsync(userId);
        user.PlanCode = request.PlanCode;

        var updated = await users.UpdateAsync(user);
        if (!updated.Succeeded)
        {
            throw Errors.Server();
        }

        return await IssueAsync(user);
    }

    public async Task DeleteAccountAsync(
        Guid userId,
        DeleteAccountRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await FindUserAsync(userId);

        if (!await users.CheckPasswordAsync(user, request.Password))
        {
            throw Errors.Validation("password", WrongPasswordMessage);
        }

        await eraser.EraseAsync(user.Id, cancellationToken);

        var deleted = await users.DeleteAsync(user);
        if (!deleted.Succeeded)
        {
            throw Errors.Server();
        }
    }

    private Task<bool> IsPublishedPlanAsync(string code) =>
        db.Plans.AnyAsync(p => p.Code == code && p.IsPublished);

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private async Task<AppUser> FindUserAsync(Guid userId) =>
        await users.FindByIdAsync(userId.ToString()) ?? throw Errors.Unauthorized();

    private async Task<AuthResponse> IssueAsync(AppUser user)
    {
        var roles = await users.GetRolesAsync(user);
        var accessToken = tokens.CreateAccessToken(user, roles, out var expiresAt);
        var refreshToken = await tokens.CreateRefreshTokenAsync(user.Id);

        return new AuthResponse
        {
            AccessToken = accessToken,
            AccessTokenExpiresAt = expiresAt.UtcDateTime,
            RefreshToken = refreshToken,
            User = ToDto(user, roles)
        };
    }

    private async Task<UserDto> ToDtoAsync(AppUser user) => ToDto(user, await users.GetRolesAsync(user));

    private static UserDto ToDto(AppUser user, IList<string> roles) => new()
    {
        Id = user.Id,
        Email = user.Email ?? string.Empty,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Roles = [.. roles],
        PlanCode = user.PlanCode,
        CreatedAt = user.CreatedAt.UtcDateTime
    };

    private static AppException MapIdentityErrors(IdentityResult result, string passwordField)
    {
        if (result.Errors.Any(e => e.Code is "DuplicateEmail" or "DuplicateUserName"))
        {
            return Errors.EmailTaken();
        }

        var errors = new Dictionary<string, string[]>();
        foreach (var error in result.Errors)
        {
            var (field, message) = error.Code switch
            {
                "InvalidEmail" or "InvalidUserName" => ("email", ValidationMessages.InvalidEmail),
                var code when code.StartsWith("Password", StringComparison.Ordinal) =>
                    (passwordField, PasswordAttribute.Message),
                _ => ("email", InvalidValueMessage)
            };
            errors[field] = [message];
        }

        return Errors.Validation(errors);
    }
}
