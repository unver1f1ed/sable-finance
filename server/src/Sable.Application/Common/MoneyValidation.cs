using System.ComponentModel.DataAnnotations;

namespace Sable.Application.Common;

/// <summary>Limits the number of fraction digits of a decimal value.</summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class MaxDecimalsAttribute(int places) : ValidationAttribute(ValidationMessages.TooManyDecimals)
{
    public override bool IsValid(object? value) =>
        value is not decimal number || decimal.Round(number, places) == number;
}

/// <summary>Inclusive decimal range check. Bounds are doubles because attribute arguments cannot be decimals.</summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class DecimalRangeAttribute(double min, double max) : ValidationAttribute
{
    public override bool IsValid(object? value) =>
        value is not decimal number || (number >= (decimal)min && number <= (decimal)max);
}

/// <summary>A positive money amount that does not exceed one billion.</summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class MoneyAmountAttribute : ValidationAttribute
{
    public const decimal Max = 1_000_000_000m;

    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        if (value is not decimal number)
        {
            return ValidationResult.Success;
        }

        if (number <= 0)
        {
            return new ValidationResult(ValidationMessages.AmountPositive);
        }

        return number > Max ? new ValidationResult(ValidationMessages.AmountTooLarge) : ValidationResult.Success;
    }
}
