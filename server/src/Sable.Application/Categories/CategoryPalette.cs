namespace Sable.Application.Categories;

public static class CategoryPalette
{
    public static readonly IReadOnlyList<string> Icons =
    [
        "cart", "home", "nav", "coffee", "heart", "play", "phone", "zap", "briefcase", "trend",
        "gift", "target", "file", "star", "wallet", "card", "shield", "pin", "layers"
    ];

    public static readonly IReadOnlyList<string> Colors =
    [
        "#6FDBD4", "#A78BFA", "#60A5FA", "#FFB454", "#F472B6", "#FF6B6B", "#61D96C", "#A0A1A8"
    ];

    public static bool IsIcon(string? value) => value is not null && Icons.Contains(value);

    public static bool IsColor(string? value) =>
        value is not null && Colors.Contains(value, StringComparer.OrdinalIgnoreCase);

    public static string NormalizeColor(string value) => value.ToUpperInvariant();
}
