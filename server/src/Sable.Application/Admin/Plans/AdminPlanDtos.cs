using System.ComponentModel.DataAnnotations;
using Sable.Application.Common;
using Sable.Application.Content;

namespace Sable.Application.Admin.Plans;

public sealed record AdminPlanDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public decimal PriceMonthly { get; init; }
    public decimal PriceYearlyPerMonth { get; init; }
    public bool IsPopular { get; init; }
    public bool IsPublished { get; init; }
    public int SortOrder { get; init; }
    public int UserCount { get; init; }
}

public sealed record AdminPlanInput
{
    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(40, ErrorMessage = ValidationMessages.MaxLength40)]
    public string Name { get; init; } = string.Empty;

    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(120, ErrorMessage = ValidationMessages.MaxLength120)]
    public string Description { get; init; } = string.Empty;

    [DecimalRange(0, 100_000, ErrorMessage = ValidationMessages.PriceRange)]
    [MaxDecimals(2)]
    public decimal PriceMonthly { get; init; }

    [DecimalRange(0, 100_000, ErrorMessage = ValidationMessages.PriceRange)]
    [MaxDecimals(2)]
    public decimal PriceYearlyPerMonth { get; init; }

    public bool IsPopular { get; init; }

    public bool IsPublished { get; init; }
}

public sealed record AdminFeatureDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public int SortOrder { get; init; }
    public IReadOnlyDictionary<string, FeatureValueDto> Values { get; init; } = new Dictionary<string, FeatureValueDto>();
}

public sealed record AdminFeatureInput
{
    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(80, ErrorMessage = ValidationMessages.MaxLength80)]
    public string Name { get; init; } = string.Empty;

    public Dictionary<string, FeatureValueDto> Values { get; init; } = [];
}

public sealed record FeatureOrderInput
{
    public List<Guid> Ids { get; init; } = [];
}
