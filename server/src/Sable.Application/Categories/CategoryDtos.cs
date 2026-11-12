using System.ComponentModel.DataAnnotations;
using Sable.Application.Common;
using Sable.Domain.Enums;

namespace Sable.Application.Categories;

public sealed record CategoryDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public TransactionType Type { get; init; }
    public string Icon { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
    public bool IsSystem { get; init; }
    public bool IsGoalContribution { get; init; }
}

public sealed record CategoryInput
{
    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(40, ErrorMessage = ValidationMessages.MaxLength40)]
    public string Name { get; init; } = string.Empty;

    [EnumDataType(typeof(TransactionType), ErrorMessage = ValidationMessages.ChooseFromList)]
    public TransactionType Type { get; init; }

    [IconKey]
    public string Icon { get; init; } = string.Empty;

    [PaletteColor]
    public string Color { get; init; } = string.Empty;
}

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class IconKeyAttribute() : ValidationAttribute(ValidationMessages.ChooseIcon)
{
    public override bool IsValid(object? value) => CategoryPalette.IsIcon(value as string);
}

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class PaletteColorAttribute() : ValidationAttribute(ValidationMessages.ChooseColor)
{
    public override bool IsValid(object? value) => CategoryPalette.IsColor(value as string);
}
