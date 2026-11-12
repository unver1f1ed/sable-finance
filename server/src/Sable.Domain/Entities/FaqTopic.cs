namespace Sable.Domain.Entities;

public class FaqTopic
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public List<FaqItem> Items { get; set; } = [];
}
