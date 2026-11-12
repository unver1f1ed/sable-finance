using System.Linq.Expressions;
using Sable.Domain.Entities;

namespace Sable.Application.Transactions;

public static class TransactionProjections
{
    public static readonly Expression<Func<Transaction, TransactionDto>> ToDto = t => new TransactionDto
    {
        Id = t.Id,
        Type = t.Type,
        Amount = t.Amount,
        OccurredOn = t.OccurredOn,
        Description = t.Description,
        Note = t.Note,
        Account = new IdName(t.AccountId, t.Account.Name),
        Category = new CategoryRef(t.CategoryId, t.Category.Name, t.Category.Icon, t.Category.Color),
        Goal = t.Goal == null ? null : new IdName(t.Goal.Id, t.Goal.Name)
    };
}
