using System.ComponentModel.DataAnnotations;
using Sable.Application.Common;

namespace Sable.Application.Admin.Users;

public sealed record AdminUserDto
{
    public Guid Id { get; init; }
    public string Email { get; init; } = string.Empty;
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public string PlanCode { get; init; } = string.Empty;
    public bool IsBlocked { get; init; }
    public DateTime CreatedAt { get; init; }
    public int TransactionCount { get; init; }
}

public sealed record AdminUserStats(int Total, int ActiveThisMonth, int OnPlus, int Blocked);

public sealed record AdminUserInput
{
    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(60, ErrorMessage = ValidationMessages.MaxLength60)]
    public string FirstName { get; init; } = string.Empty;

    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(60, ErrorMessage = ValidationMessages.MaxLength60)]
    public string LastName { get; init; } = string.Empty;

    [AllowedValues("User", "Admin", ErrorMessage = ValidationMessages.ChooseFromList)]
    public string Role { get; init; } = string.Empty;

    [Required(ErrorMessage = ValidationMessages.Required)]
    public string PlanCode { get; init; } = string.Empty;

    public bool IsBlocked { get; init; }
}

public sealed record AdminUserQuery
{
    public string? Search { get; init; }
    public string? Role { get; init; }
    public string? PlanCode { get; init; }
    public string? Status { get; init; }
    public string? Sort { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = PageRequest.DefaultPageSize;
}
