using System.ComponentModel.DataAnnotations;
using Sable.Application.Categories;
using Sable.Application.Common;

namespace Sable.Application.Goals;

public sealed record GoalDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public decimal TargetAmount { get; init; }
    public decimal CurrentAmount { get; init; }
    public DateOnly? Deadline { get; init; }
    public string Icon { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
    public bool IsAchieved { get; init; }
    public bool IsArchived { get; init; }
    public long? MonthlyNeeded { get; init; }
}

public sealed record GoalInput
{
    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(60, ErrorMessage = ValidationMessages.MaxLength60)]
    public string Name { get; init; } = string.Empty;

    [MoneyAmount]
    [MaxDecimals(2)]
    public decimal TargetAmount { get; init; }

    public DateOnly? Deadline { get; init; }

    [IconKey]
    public string Icon { get; init; } = string.Empty;

    [PaletteColor]
    public string Color { get; init; } = string.Empty;
}

public sealed record ContributionInput
{
    [MoneyAmount]
    [MaxDecimals(2)]
    public decimal Amount { get; init; }

    public Guid AccountId { get; init; }

    public DateOnly OccurredOn { get; init; }
}
