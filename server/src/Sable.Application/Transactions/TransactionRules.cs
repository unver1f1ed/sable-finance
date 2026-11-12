namespace Sable.Application.Transactions;

public static class TransactionRules
{
    private static readonly DateOnly EarliestDate = new(2000, 1, 1);

    /// <summary>A transaction date must be no earlier than 2000-01-01 and no later than tomorrow.</summary>
    public static bool IsDateAllowed(DateOnly occurredOn, DateOnly today) =>
        occurredOn >= EarliestDate && occurredOn <= today.AddDays(1);
}
