namespace Sable.Domain.Entities;

public class PlanFeature
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public List<PlanFeatureValue> Values { get; set; } = [];
}
