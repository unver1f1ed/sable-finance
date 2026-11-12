using System.Globalization;

namespace Sable.Application.Common;

public static class MonthParser
{
    /// <summary>Parses YYYY-MM into the first day of that month; an empty value means the month of <paramref name="today"/>.</summary>
    public static DateOnly Parse(string? month, DateOnly today)
    {
        if (string.IsNullOrWhiteSpace(month))
        {
            return new DateOnly(today.Year, today.Month, 1);
        }

        if (month.Length != 7
            || !DateOnly.TryParseExact(month + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            throw Errors.Validation("month", ValidationMessages.InvalidMonth);
        }

        return parsed;
    }

    public static string Format(DateOnly date) => date.ToString("yyyy-MM", CultureInfo.InvariantCulture);
}
