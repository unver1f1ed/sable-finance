using System.ComponentModel.DataAnnotations;
using Sable.Application.Common;

namespace Sable.Application.Admin.Faq;

public sealed record AdminFaqTopicDto(Guid Id, string Name, int SortOrder, int ItemCount);

public sealed record AdminFaqTopicInput
{
    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(60, ErrorMessage = ValidationMessages.MaxLength60)]
    public string Name { get; init; } = string.Empty;
}

public sealed record AdminFaqItemDto
{
    public Guid Id { get; init; }
    public Guid TopicId { get; init; }
    public string TopicName { get; init; } = string.Empty;
    public string Question { get; init; } = string.Empty;
    public string Answer { get; init; } = string.Empty;
    public bool IsPublished { get; init; }
    public int SortOrder { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed record AdminFaqItemInput
{
    public Guid TopicId { get; init; }

    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(160, MinimumLength = 5, ErrorMessage = ValidationMessages.QuestionLength)]
    public string Question { get; init; } = string.Empty;

    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(600, MinimumLength = 10, ErrorMessage = ValidationMessages.AnswerLength)]
    public string Answer { get; init; } = string.Empty;

    public bool IsPublished { get; init; }
}

public sealed record AdminFaqItemQuery
{
    public string? Search { get; init; }
    public Guid? TopicId { get; init; }
}
