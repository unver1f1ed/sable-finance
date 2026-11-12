using Sable.Domain.Enums;

namespace Sable.Domain.Entities;

public class Transaction : IUserOwned
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid AccountId { get; set; }
    public Guid CategoryId { get; set; }
    public Guid? GoalId { get; set; }
    public TransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public DateOnly OccurredOn { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Account Account { get; set; } = null!;
    public Category Category { get; set; } = null!;
    public Goal? Goal { get; set; }
}
