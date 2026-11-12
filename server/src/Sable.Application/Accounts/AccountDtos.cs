using System.ComponentModel.DataAnnotations;
using Sable.Application.Common;
using Sable.Domain.Enums;

namespace Sable.Application.Accounts;

public sealed record AccountDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public AccountType Type { get; init; }
    public decimal InitialBalance { get; init; }
    public decimal Balance { get; init; }
    public bool IsDefault { get; init; }
    public int TransactionCount { get; init; }
}

public sealed record AccountInput
{
    [Required(ErrorMessage = ValidationMessages.Required)]
    [StringLength(60, ErrorMessage = ValidationMessages.MaxLength60)]
    public string Name { get; init; } = string.Empty;

    [EnumDataType(typeof(AccountType), ErrorMessage = ValidationMessages.ChooseFromList)]
    public AccountType Type { get; init; }

    [DecimalRange(-1_000_000_000, 1_000_000_000, ErrorMessage = ValidationMessages.BalanceRange)]
    [MaxDecimals(2)]
    public decimal InitialBalance { get; init; }

    public bool IsDefault { get; init; }
}
