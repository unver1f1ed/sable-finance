using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Sable.Application.Abstractions;
using Sable.Application.Common;
using Sable.Domain.Entities;
using Sable.Domain.Enums;

namespace Sable.Application.Accounts;

public class AccountService(IFinanceDbContext db, ICurrentUser currentUser, TimeProvider timeProvider) : IAccountService
{
    private const string PlanLimitMessage =
        "На тарифі Старт доступно до 2 рахунків. Перейдіть на Плюс, щоб додати більше";
    private const string DuplicateNameMessage = "Рахунок із такою назвою вже існує";
    private const string HasTransactionsMessage = "Рахунок має транзакції. Спершу видаліть або перенесіть їх";

    private static readonly Expression<Func<Account, AccountDto>> ToDto = a => new AccountDto
    {
        Id = a.Id,
        Name = a.Name,
        Type = a.Type,
        InitialBalance = a.InitialBalance,
        Balance = a.InitialBalance
            + (a.Transactions.Where(t => t.Type == TransactionType.Income).Sum(t => (decimal?)t.Amount) ?? 0m)
            - (a.Transactions.Where(t => t.Type == TransactionType.Expense).Sum(t => (decimal?)t.Amount) ?? 0m),
        IsDefault = a.IsDefault,
        TransactionCount = a.Transactions.Count()
    };

    public async Task<IReadOnlyList<AccountDto>> ListAsync(CancellationToken cancellationToken = default) =>
        await db.Accounts
            .OrderByDescending(a => a.IsDefault)
            .ThenBy(a => a.Name)
            .ThenBy(a => a.Id)
            .Select(ToDto)
            .ToListAsync(cancellationToken);

    public async Task<AccountDto> CreateAsync(AccountInput input, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();
        var name = input.Name.Trim();

        var existing = await db.Accounts.CountAsync(cancellationToken);
        if (!currentUser.HasUnlimitedPlan() && existing >= PlanLimits.StartMaxAccounts)
        {
            throw Errors.PlanLimit(PlanLimitMessage);
        }

        await EnsureNameIsFreeAsync(name, null, cancellationToken);

        var isDefault = existing == 0 || input.IsDefault;
        if (isDefault)
        {
            await ClearDefaultAsync(null, cancellationToken);
        }

        var account = new Account
        {
            Id = Guid.CreateVersion7(),
            UserId = userId,
            Name = name,
            Type = input.Type,
            InitialBalance = input.InitialBalance,
            IsDefault = isDefault,
            CreatedAt = timeProvider.GetUtcNow()
        };
        db.Accounts.Add(account);
        await db.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(account.Id, cancellationToken);
    }

    public async Task<AccountDto> UpdateAsync(Guid id, AccountInput input, CancellationToken cancellationToken = default)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == id, cancellationToken)
            ?? throw Errors.NotFound();
        var name = input.Name.Trim();

        await EnsureNameIsFreeAsync(name, id, cancellationToken);

        if (input.IsDefault && !account.IsDefault)
        {
            await ClearDefaultAsync(id, cancellationToken);
            account.IsDefault = true;
        }

        account.Name = name;
        account.Type = input.Type;
        account.InitialBalance = input.InitialBalance;
        await db.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == id, cancellationToken)
            ?? throw Errors.NotFound();

        if (await db.Transactions.AnyAsync(t => t.AccountId == id, cancellationToken))
        {
            throw Errors.Conflict(HasTransactionsMessage);
        }

        db.Accounts.Remove(account);

        if (account.IsDefault)
        {
            var next = await db.Accounts
                .Where(a => a.Id != id)
                .OrderBy(a => a.CreatedAt)
                .ThenBy(a => a.Id)
                .FirstOrDefaultAsync(cancellationToken);
            if (next is not null)
            {
                next.IsDefault = true;
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureNameIsFreeAsync(string name, Guid? excludeId, CancellationToken cancellationToken)
    {
        var lowered = name.ToLower();
        var taken = await db.Accounts.AnyAsync(
            a => a.Name.ToLower() == lowered && (excludeId == null || a.Id != excludeId),
            cancellationToken);
        if (taken)
        {
            throw Errors.Conflict(DuplicateNameMessage);
        }
    }

    private async Task ClearDefaultAsync(Guid? exceptId, CancellationToken cancellationToken)
    {
        var current = await db.Accounts
            .Where(a => a.IsDefault && (exceptId == null || a.Id != exceptId))
            .ToListAsync(cancellationToken);
        foreach (var other in current)
        {
            other.IsDefault = false;
        }
    }

    private Task<AccountDto> GetDtoAsync(Guid id, CancellationToken cancellationToken) =>
        db.Accounts.Where(a => a.Id == id).Select(ToDto).SingleAsync(cancellationToken);
}
