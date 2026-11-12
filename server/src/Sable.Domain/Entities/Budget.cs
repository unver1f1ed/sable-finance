namespace Sable.Domain.Entities;

public class Budget : IUserOwned
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid CategoryId { get; set; }
    public decimal LimitAmount { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Category Category { get; set; } = null!;
}
