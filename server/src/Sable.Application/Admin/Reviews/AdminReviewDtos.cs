using System.ComponentModel.DataAnnotations;
using Sable.Application.Common;

namespace Sable.Application.Admin.Reviews;

public sealed record AdminReviewDto
{
    public Guid Id { get; init; }
    public string Author { get; init; } = string.Empty;
    public string Text { get; init; } = string.Empty;
    public int Rating { get; init; }
    public bool IsPublished { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed record AdminReviewInput
{
    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(60, ErrorMessage = ValidationMessages.MaxLength60)]
    public string Author { get; init; } = string.Empty;

    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(280, MinimumLength = 10, ErrorMessage = ValidationMessages.ReviewTextLength)]
    public string Text { get; init; } = string.Empty;

    [Range(1, 5, ErrorMessage = ValidationMessages.RatingRange)]
    public int Rating { get; init; }

    public bool IsPublished { get; init; }
}

public sealed record AdminReviewQuery
{
    public string? Search { get; init; }
    public string? Status { get; init; }
    public int? Rating { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = PageRequest.DefaultPageSize;
}
