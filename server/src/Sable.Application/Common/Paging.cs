namespace Sable.Application.Common;

public record Paged<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];
    public int Total { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
}

public readonly record struct PageRequest(int Page, int PageSize)
{
    public const int DefaultPageSize = 10;

    public static readonly IReadOnlyList<int> AllowedPageSizes = [10, 20, 50];

    public int Skip => (Page - 1) * PageSize;

    /// <summary>Adds messages for invalid paging values to <paramref name="errors"/> under the fields page and pageSize.</summary>
    public static void Validate(int page, int pageSize, IDictionary<string, string[]> errors)
    {
        if (page < 1)
        {
            errors["page"] = [ValidationMessages.PageMin];
        }

        if (!AllowedPageSizes.Contains(pageSize))
        {
            errors["pageSize"] = [ValidationMessages.PageSizeAllowed];
        }
    }
}
