using Sable.Domain.Enums;

namespace Sable.Infrastructure.Finance.Seed;

public static class SystemCategories
{
    public sealed record Definition(
        string Name,
        TransactionType Type,
        string Icon,
        string Color,
        bool IsGoalContribution = false);

    public static readonly Definition[] All =
    [
        new("Житло", TransactionType.Expense, "home", "#A78BFA"),
        new("Продукти", TransactionType.Expense, "cart", "#6FDBD4"),
        new("Кафе й ресторани", TransactionType.Expense, "coffee", "#FFB454"),
        new("Транспорт", TransactionType.Expense, "nav", "#60A5FA"),
        new("Здоров’я", TransactionType.Expense, "heart", "#F472B6"),
        new("Розваги", TransactionType.Expense, "play", "#FF6B6B"),
        new("Зв’язок", TransactionType.Expense, "phone", "#A0A1A8"),
        new("Комунальні", TransactionType.Expense, "zap", "#FFB454"),
        new("Внесок у ціль", TransactionType.Expense, "target", "#6FDBD4", IsGoalContribution: true),
        new("Зарплата", TransactionType.Income, "briefcase", "#61D96C"),
        new("Підробіток", TransactionType.Income, "trend", "#61D96C"),
        new("Подарунки", TransactionType.Income, "gift", "#F472B6")
    ];
}
