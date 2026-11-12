using Sable.Domain.Enums;

namespace Sable.Infrastructure.Finance.Seed;

public static class PlanSeed
{
    public sealed record PlanDefinition(
        string Code,
        string Name,
        string Description,
        decimal PriceMonthly,
        decimal PriceYearlyPerMonth,
        bool IsPopular,
        int SortOrder);

    public sealed record FeatureValue(FeatureKind Kind, string? Text = null);

    public sealed record FeatureDefinition(string Name, FeatureValue Start, FeatureValue Plus);

    private static readonly FeatureValue Included = new(FeatureKind.Included);
    private static readonly FeatureValue NotIncluded = new(FeatureKind.NotIncluded);

    private static FeatureValue Text(string text) => new(FeatureKind.Text, text);

    public static readonly PlanDefinition[] Plans =
    [
        new("start", "Sable Старт", "Усе потрібне, щоб розібратися, куди йдуть гроші.", 0, 0, false, 1),
        new("plus", "Sable Плюс", "Повне планування: необмежені рахунки, цілі та аналітика.", 129, 103, true, 2)
    ];

    public static readonly FeatureDefinition[] Features =
    [
        new("Облік доходів і витрат", Included, Included),
        new("Категорії та власні мітки", Included, Included),
        new("Кількість рахунків", Text("До 2"), Text("Без обмежень")),
        new("Бюджети за категоріями", Text("5 категорій"), Text("Усі категорії")),
        new("Фінансові цілі", Text("1 ціль"), Text("Без обмежень")),
        new("Аналітика за довільний період", NotIncluded, Included),
        new("Експорт у CSV", NotIncluded, Included),
        new("Пріоритетна підтримка", NotIncluded, Included)
    ];
}
