using Microsoft.EntityFrameworkCore;
using Sable.Application.Abstractions;
using Sable.Application.Common;
using Sable.Domain.Entities;

namespace Sable.Application.Admin.Reviews;

public class AdminReviewService(IFinanceDbContext db, TimeProvider timeProvider) : IAdminReviewService
{
    private static readonly string[] StatusValues = ["published", "hidden"];

    private static AdminReviewDto ToDto(Review r) => new()
    {
        Id = r.Id,
        Author = r.Author,
        Text = r.Text,
        Rating = r.Rating,
        IsPublished = r.IsPublished,
        CreatedAt = r.CreatedAt.UtcDateTime
    };

    public async Task<Paged<AdminReviewDto>> ListAsync(
        AdminReviewQuery query,
        CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (!string.IsNullOrEmpty(query.Status) && !StatusValues.Contains(query.Status))
        {
            errors["status"] = [ValidationMessages.ChooseFromList];
        }

        if (query.Rating is < 1 or > 5)
        {
            errors["rating"] = [ValidationMessages.RatingRange];
        }

        PageRequest.Validate(query.Page, query.PageSize, errors);
        if (errors.Count > 0)
        {
            throw Errors.Validation(errors);
        }

        var filtered = db.Reviews.AsQueryable();

        var search = query.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
        {
            var lowered = search.ToLower();
            filtered = filtered.Where(r => r.Author.ToLower().Contains(lowered) || r.Text.ToLower().Contains(lowered));
        }

        if (query.Status == "published")
        {
            filtered = filtered.Where(r => r.IsPublished);
        }
        else if (query.Status == "hidden")
        {
            filtered = filtered.Where(r => !r.IsPublished);
        }

        if (query.Rating is { } rating)
        {
            filtered = filtered.Where(r => r.Rating == rating);
        }

        var page = new PageRequest(query.Page, query.PageSize);
        var total = await filtered.CountAsync(cancellationToken);
        var items = await filtered
            .OrderByDescending(r => r.CreatedAt)
            .ThenByDescending(r => r.Id)
            .Skip(page.Skip)
            .Take(page.PageSize)
            .ToListAsync(cancellationToken);

        return new Paged<AdminReviewDto> { Items = items.Select(ToDto).ToList(), Total = total, Page = page.Page, PageSize = page.PageSize };
    }

    public async Task<AdminReviewDto> CreateAsync(AdminReviewInput input, CancellationToken cancellationToken = default)
    {
        var review = new Review { Id = Guid.CreateVersion7(), CreatedAt = timeProvider.GetUtcNow() };
        Apply(review, input);
        db.Reviews.Add(review);
        await db.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(review.Id, cancellationToken);
    }

    public async Task<AdminReviewDto> UpdateAsync(
        Guid id,
        AdminReviewInput input,
        CancellationToken cancellationToken = default)
    {
        var review = await db.Reviews.FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw Errors.NotFound();

        Apply(review, input);
        await db.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var review = await db.Reviews.FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw Errors.NotFound();

        db.Reviews.Remove(review);
        await db.SaveChangesAsync(cancellationToken);
    }

    private static void Apply(Review review, AdminReviewInput input)
    {
        review.Author = input.Author.Trim();
        review.Text = input.Text.Trim();
        review.Rating = input.Rating;
        review.IsPublished = input.IsPublished;
    }

    private async Task<AdminReviewDto> GetDtoAsync(Guid id, CancellationToken cancellationToken) =>
        ToDto(await db.Reviews.SingleAsync(r => r.Id == id, cancellationToken));
}
