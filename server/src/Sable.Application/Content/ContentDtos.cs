using System.ComponentModel.DataAnnotations;
using Sable.Application.Common;
using Sable.Domain.Enums;

namespace Sable.Application.Content;

public sealed record PlanDto
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public decimal PriceMonthly { get; init; }
    public decimal PriceYearlyPerMonth { get; init; }
    public bool IsPopular { get; init; }
}

public sealed record FeatureValueDto(FeatureKind Kind, string? Text);

public sealed record PlanFeatureDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public IReadOnlyDictionary<string, FeatureValueDto> Values { get; init; } = new Dictionary<string, FeatureValueDto>();
}

public sealed record PlanComparisonDto
{
    public IReadOnlyList<PlanDto> Plans { get; init; } = [];
    public IReadOnlyList<PlanFeatureDto> Features { get; init; } = [];
}

public sealed record ReviewDto(Guid Id, string Author, string Text, int Rating);

public sealed record ReviewsDto
{
    public decimal Average { get; init; }
    public IReadOnlyList<ReviewDto> Items { get; init; } = [];
}

public sealed record FaqItemDto(Guid Id, string Question, string Answer);

public sealed record FaqTopicDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public IReadOnlyList<FaqItemDto> Items { get; init; } = [];
}

public sealed record ContactInput
{
    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(60, ErrorMessage = ValidationMessages.MaxLength60)]
    public string Name { get; init; } = string.Empty;

    [Required(ErrorMessage = ValidationMessages.Required)]
    [EmailAddress(ErrorMessage = ValidationMessages.InvalidEmail)]
    [StringLength(120, ErrorMessage = ValidationMessages.EmailTooLong)]
    public string Email { get; init; } = string.Empty;

    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(60, ErrorMessage = ValidationMessages.MaxLength60)]
    public string Topic { get; init; } = string.Empty;

    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(1000, MinimumLength = 10, ErrorMessage = ValidationMessages.MessageLength)]
    public string Message { get; init; } = string.Empty;

    [MustBeTrue(ErrorMessage = ValidationMessages.ConsentRequired)]
    public bool Consent { get; init; }
}

public sealed record ContactResult(Guid Id);

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class MustBeTrueAttribute : ValidationAttribute
{
    public override bool IsValid(object? value) => value is true;
}
