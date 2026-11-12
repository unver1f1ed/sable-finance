using System.ComponentModel.DataAnnotations;
using Sable.Application.Common;
using Sable.Domain.Enums;

namespace Sable.Application.Transactions;

public sealed record IdName(Guid Id, string Name);

public sealed record CategoryRef(Guid Id, string Name, string Icon, string Color);

public sealed record TransactionDto
{
    public Guid Id { get; init; }
    public TransactionType Type { get; init; }
    public decimal Amount { get; init; }
    public DateOnly OccurredOn { get; init; }
    public string Description { get; init; } = string.Empty;
    public string? Note { get; init; }
    public IdName Account { get; init; } = null!;
    public CategoryRef Category { get; init; } = null!;
    public IdName? Goal { get; init; }
}

public sealed record TransactionInput
{
    [EnumDataType(typeof(TransactionType), ErrorMessage = ValidationMessages.ChooseFromList)]
    public TransactionType Type { get; init; }

    [MoneyAmount]
    [MaxDecimals(2)]
    public decimal Amount { get; init; }

    public DateOnly OccurredOn { get; init; }

    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(120, ErrorMessage = ValidationMessages.MaxLength120)]
    public string Description { get; init; } = string.Empty;

    [StringLength(300, ErrorMessage = ValidationMessages.MaxLength300)]
    public string? Note { get; init; }

    public Guid AccountId { get; init; }
    public Guid CategoryId { get; init; }
    public Guid? GoalId { get; init; }
}

public sealed record TransactionQuery
{
    public string? Search { get; init; }
    public TransactionType? Type { get; init; }
    public Guid? AccountId { get; init; }
    public Guid? CategoryId { get; init; }
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
    public string? Sort { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = PageRequest.DefaultPageSize;
}

public sealed record TransactionList : Paged<TransactionDto>
{
    public decimal TotalIncome { get; init; }
    public decimal TotalExpense { get; init; }
}

public sealed record TransactionExport(string FileName, byte[] Content);
