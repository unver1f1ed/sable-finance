using Microsoft.EntityFrameworkCore;
using Sable.Application.Abstractions;
using Sable.Application.Common;
using Sable.Domain.Entities;

namespace Sable.Application.Transactions;

public class TransactionService(IFinanceDbContext db, ICurrentUser currentUser, TimeProvider timeProvider)
    : ITransactionService
{
    private static readonly DateOnly EarliestDate = new(2000, 1, 1);

    public async Task<TransactionDto> GetAsync(Guid id, CancellationToken cancellationToken = default) =>
        await db.Transactions
            .Where(t => t.Id == id)
            .Select(TransactionProjections.ToDto)
            .FirstOrDefaultAsync(cancellationToken)
        ?? throw Errors.NotFound();

    public async Task<TransactionDto> CreateAsync(TransactionInput input, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();
        await ValidateAsync(input, cancellationToken);

        var transaction = new Transaction
        {
            Id = Guid.CreateVersion7(),
            UserId = userId,
            CreatedAt = timeProvider.GetUtcNow()
        };
        Apply(transaction, input);
        db.Transactions.Add(transaction);
        await db.SaveChangesAsync(cancellationToken);

        return await GetAsync(transaction.Id, cancellationToken);
    }

    public async Task<TransactionDto> UpdateAsync(
        Guid id,
        TransactionInput input,
        CancellationToken cancellationToken = default)
    {
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == id, cancellationToken)
            ?? throw Errors.NotFound();
        await ValidateAsync(input, cancellationToken);

        Apply(transaction, input);
        await db.SaveChangesAsync(cancellationToken);

        return await GetAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == id, cancellationToken)
            ?? throw Errors.NotFound();

        db.Transactions.Remove(transaction);
        await db.SaveChangesAsync(cancellationToken);
    }

    private static void Apply(Transaction transaction, TransactionInput input)
    {
        transaction.Type = input.Type;
        transaction.Amount = input.Amount;
        transaction.OccurredOn = input.OccurredOn;
        transaction.Description = input.Description.Trim();
        transaction.Note = string.IsNullOrWhiteSpace(input.Note) ? null : input.Note.Trim();
        transaction.AccountId = input.AccountId;
        transaction.CategoryId = input.CategoryId;
        transaction.GoalId = input.GoalId;
    }

    private async Task ValidateAsync(TransactionInput input, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();

        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        if (input.OccurredOn < EarliestDate || input.OccurredOn > today.AddDays(1))
        {
            errors["occurredOn"] = [ValidationMessages.InvalidDate];
        }

        if (!await db.Accounts.AnyAsync(a => a.Id == input.AccountId, cancellationToken))
        {
            errors["accountId"] = [ValidationMessages.AccountNotFound];
        }

        var category = await db.Categories
            .Where(c => c.Id == input.CategoryId)
            .Select(c => new { c.Type, c.IsGoalContribution })
            .FirstOrDefaultAsync(cancellationToken);

        if (category is null)
        {
            errors["categoryId"] = [ValidationMessages.CategoryNotFound];
        }
        else if (category.Type != input.Type)
        {
            errors["categoryId"] = [ValidationMessages.CategoryTypeMismatch];
        }

        if (input.GoalId is { } goalId)
        {
            if (category is { IsGoalContribution: false })
            {
                errors["goalId"] = [ValidationMessages.GoalOnlyForContribution];
            }
            else if (!await db.Goals.AnyAsync(g => g.Id == goalId, cancellationToken))
            {
                errors["goalId"] = [ValidationMessages.GoalNotFound];
            }
        }

        if (errors.Count > 0)
        {
            throw Errors.Validation(errors);
        }
    }
}
