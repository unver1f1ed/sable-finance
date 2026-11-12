using Sable.Domain.Enums;

namespace Sable.Domain.Entities;

public class PlanFeatureValue
{
    public Guid PlanId { get; set; }
    public Guid FeatureId { get; set; }
    public FeatureKind Kind { get; set; }
    public string? Text { get; set; }

    public Plan Plan { get; set; } = null!;
    public PlanFeature Feature { get; set; } = null!;
}
