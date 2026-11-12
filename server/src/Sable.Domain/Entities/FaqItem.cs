namespace Sable.Domain.Entities;

public class FaqItem
{
    public Guid Id { get; set; }
    public Guid TopicId { get; set; }
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public bool IsPublished { get; set; }
    public int SortOrder { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public FaqTopic Topic { get; set; } = null!;
}
