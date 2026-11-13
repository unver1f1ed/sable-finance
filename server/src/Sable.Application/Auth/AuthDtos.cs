using System.ComponentModel.DataAnnotations;
using Sable.Application.Common;

namespace Sable.Application.Auth;

public sealed record RegisterRequest
{
    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(60, MinimumLength = 1, ErrorMessage = ValidationMessages.NameLength)]
    public string FirstName { get; init; } = string.Empty;

    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(60, MinimumLength = 1, ErrorMessage = ValidationMessages.NameLength)]
    public string LastName { get; init; } = string.Empty;

    [Required(ErrorMessage = ValidationMessages.Required)]
    [EmailAddress(ErrorMessage = ValidationMessages.InvalidEmail)]
    [StringLength(120, ErrorMessage = ValidationMessages.EmailTooLong)]
    public string Email { get; init; } = string.Empty;

    [Password]
    public string Password { get; init; } = string.Empty;

    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(20, ErrorMessage = ValidationMessages.MaxLength20)]
    public string PlanCode { get; init; } = string.Empty;
}

public sealed record LoginRequest
{
    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(120, ErrorMessage = ValidationMessages.MaxLength120)]
    public string Email { get; init; } = string.Empty;

    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(100, ErrorMessage = ValidationMessages.MaxLength100)]
    public string Password { get; init; } = string.Empty;
}

public sealed record RefreshRequest
{
    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(200, ErrorMessage = ValidationMessages.MaxLength200)]
    public string RefreshToken { get; init; } = string.Empty;
}

public sealed record LogoutRequest
{
    [StringLength(200, ErrorMessage = ValidationMessages.MaxLength200)]
    public string? RefreshToken { get; init; }
}

public sealed record UpdateProfileRequest
{
    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(60, MinimumLength = 1, ErrorMessage = ValidationMessages.NameLength)]
    public string FirstName { get; init; } = string.Empty;

    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(60, MinimumLength = 1, ErrorMessage = ValidationMessages.NameLength)]
    public string LastName { get; init; } = string.Empty;

    [Required(ErrorMessage = ValidationMessages.Required)]
    [EmailAddress(ErrorMessage = ValidationMessages.InvalidEmail)]
    [StringLength(120, ErrorMessage = ValidationMessages.EmailTooLong)]
    public string Email { get; init; } = string.Empty;
}

public sealed record ChangePasswordRequest
{
    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(100, ErrorMessage = ValidationMessages.MaxLength100)]
    public string CurrentPassword { get; init; } = string.Empty;

    [Password]
    public string NewPassword { get; init; } = string.Empty;
}

public sealed record ChangePlanRequest
{
    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(20, ErrorMessage = ValidationMessages.MaxLength20)]
    public string PlanCode { get; init; } = string.Empty;
}

public sealed record DeleteAccountRequest
{
    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(100, ErrorMessage = ValidationMessages.MaxLength100)]
    public string Password { get; init; } = string.Empty;
}

public sealed record UserDto
{
    public Guid Id { get; init; }
    public string Email { get; init; } = string.Empty;
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string[] Roles { get; init; } = [];
    public string PlanCode { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
}

public sealed record AuthResponse
{
    public string AccessToken { get; init; } = string.Empty;
    public DateTime AccessTokenExpiresAt { get; init; }
    public string RefreshToken { get; init; } = string.Empty;
    public UserDto User { get; init; } = new();
}
