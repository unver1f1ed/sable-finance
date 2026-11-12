using Sable.Domain.Enums;

namespace Sable.Domain.Entities;

public class Account : IUserOwned
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public AccountType Type { get; set; }
    public decimal InitialBalance { get; set; }
    public bool IsDefault { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public List<Transaction> Transactions { get; set; } = [];
}
