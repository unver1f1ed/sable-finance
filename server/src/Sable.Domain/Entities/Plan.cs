namespace Sable.Domain.Entities;

public class Plan
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal PriceMonthly { get; set; }
    public decimal PriceYearlyPerMonth { get; set; }
    public bool IsPopular { get; set; }
    public bool IsPublished { get; set; }
    public int SortOrder { get; set; }

    public List<PlanFeatureValue> FeatureValues { get; set; } = [];
}
