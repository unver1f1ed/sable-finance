using Sable.Domain.Enums;

namespace Sable.Domain.Entities;

public class Category
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public TransactionType Type { get; set; }
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public bool IsGoalContribution { get; set; }

    public List<Transaction> Transactions { get; set; } = [];
    public List<Budget> Budgets { get; set; } = [];
}
