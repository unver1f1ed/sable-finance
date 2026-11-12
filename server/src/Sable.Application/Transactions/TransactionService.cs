using Microsoft.EntityFrameworkCore;
using Sable.Application.Abstractions;
using Sable.Application.Common;
using Sable.Domain.Entities;
using Sable.Domain.Enums;

namespace Sable.Application.Transactions;

public class TransactionService(IFinanceDbContext db, ICurrentUser currentUser, TimeProvider timeProvider)
    : ITransactionService
{
    private const string ExportPlanLimitMessage = "Експорт у CSV доступний на тарифі Плюс";

    private static readonly DateOnly EarliestDate = new(2000, 1, 1);

    public async Task<TransactionList> ListAsync(TransactionQuery query, CancellationToken cancellationToken = default)
    {
        var sort = ValidateQuery(query);

        var filtered = ApplyFilters(db.Transactions.AsQueryable(), query);

        var sums = await filtered
            .GroupBy(t => t.Type)
            .Select(g => new { Type = g.Key, Count = g.Count(), Sum = g.Sum(t => t.Amount) })
            .ToListAsync(cancellationToken);

        var page = new PageRequest(query.Page, query.PageSize);
        var items = await ApplySort(filtered, sort)
            .Skip(page.Skip)
            .Take(page.PageSize)
            .Select(TransactionProjections.ToDto)
            .ToListAsync(cancellationToken);

        return new TransactionList
        {
            Items = items,
            Total = sums.Sum(s => s.Count),
            Page = page.Page,
            PageSize = page.PageSize,
            TotalIncome = sums.Where(s => s.Type == TransactionType.Income).Sum(s => s.Sum),
            TotalExpense = sums.Where(s => s.Type == TransactionType.Expense).Sum(s => s.Sum)
        };
    }

    public async Task<TransactionExport> ExportAsync(TransactionQuery query, CancellationToken cancellationToken = default)
    {
        if (!currentUser.HasUnlimitedPlan())
        {
            throw Errors.PlanLimit(ExportPlanLimitMessage);
        }

        var sort = ValidateQuery(query, paged: false);

        var rows = await ApplySort(ApplyFilters(db.Transactions.AsQueryable(), query), sort)
            .Select(TransactionProjections.ToDto)
            .ToListAsync(cancellationToken);

        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        return new TransactionExport(
            $"sable-transactions-{today:yyyy-MM-dd}.csv",
            TransactionCsvWriter.Write(rows));
    }

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

    internal static IQueryable<Transaction> ApplyFilters(IQueryable<Transaction> source, TransactionQuery query)
    {
        var search = query.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
        {
            var lowered = search.ToLower();
            source = source.Where(t => t.Description.ToLower().Contains(lowered));
        }

        if (query.Type is { } type)
        {
            source = source.Where(t => t.Type == type);
        }

        if (query.AccountId is { } accountId)
        {
            source = source.Where(t => t.AccountId == accountId);
        }

        if (query.CategoryId is { } categoryId)
        {
            source = source.Where(t => t.CategoryId == categoryId);
        }

        if (query.From is { } from)
        {
            source = source.Where(t => t.OccurredOn >= from);
        }

        if (query.To is { } to)
        {
            source = source.Where(t => t.OccurredOn <= to);
        }

        return source;
    }

    internal static IOrderedQueryable<Transaction> ApplySort(IQueryable<Transaction> source, string sort) => sort switch
    {
        "date_asc" => source.OrderBy(t => t.OccurredOn).ThenBy(t => t.CreatedAt).ThenBy(t => t.Id),
        "amount_desc" => source.OrderByDescending(t => t.Amount).ThenByDescending(t => t.OccurredOn).ThenBy(t => t.Id),
        "amount_asc" => source.OrderBy(t => t.Amount).ThenByDescending(t => t.OccurredOn).ThenBy(t => t.Id),
        _ => source.OrderByDescending(t => t.OccurredOn).ThenByDescending(t => t.CreatedAt).ThenByDescending(t => t.Id)
    };

    private static readonly string[] SortValues = ["date_desc", "date_asc", "amount_desc", "amount_asc"];

    /// <summary>Validates filter, sort and paging values and returns the normalized sort key.</summary>
    private static string ValidateQuery(TransactionQuery query, bool paged = true)
    {
        var errors = new Dictionary<string, string[]>();

        if (query.From is { } from && query.To is { } to && from > to)
        {
            errors["to"] = [ValidationMessages.ToBeforeFrom];
        }

        var sort = string.IsNullOrWhiteSpace(query.Sort) ? "date_desc" : query.Sort.Trim().ToLowerInvariant();
        if (!SortValues.Contains(sort))
        {
            errors["sort"] = [ValidationMessages.UnknownSort];
        }

        if (paged)
        {
            PageRequest.Validate(query.Page, query.PageSize, errors);
        }

        if (errors.Count > 0)
        {
            throw Errors.Validation(errors);
        }

        return sort;
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
