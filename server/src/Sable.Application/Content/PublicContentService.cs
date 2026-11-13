using Microsoft.EntityFrameworkCore;
using Sable.Application.Abstractions;
using Sable.Domain.Entities;
using Sable.Domain.Enums;

namespace Sable.Application.Content;

public class PublicContentService(IFinanceDbContext db, TimeProvider timeProvider) : IPublicContentService
{
    public async Task<PlanComparisonDto> GetPlansAsync(CancellationToken cancellationToken = default)
    {
        var plans = await db.Plans
            .Where(p => p.IsPublished)
            .OrderBy(p => p.SortOrder)
            .ThenBy(p => p.Id)
            .Select(p => new PlanDto
            {
                Code = p.Code,
                Name = p.Name,
                Description = p.Description,
                PriceMonthly = p.PriceMonthly,
                PriceYearlyPerMonth = p.PriceYearlyPerMonth,
                IsPopular = p.IsPopular
            })
            .ToListAsync(cancellationToken);

        var features = await db.PlanFeatures
            .OrderBy(f => f.SortOrder)
            .ThenBy(f => f.Id)
            .Select(f => new
            {
                f.Id,
                f.Name,
                Values = f.Values
                    .Where(v => v.Plan.IsPublished)
                    .Select(v => new { v.Plan.Code, v.Kind, v.Text })
                    .ToList()
            })
            .ToListAsync(cancellationToken);

        return new PlanComparisonDto
        {
            Plans = plans,
            Features = features
                .Select(f => new PlanFeatureDto
                {
                    Id = f.Id,
                    Name = f.Name,
                    Values = plans.ToDictionary(
                        p => p.Code,
                        p => f.Values.Where(v => v.Code == p.Code)
                            .Select(v => new FeatureValueDto(v.Kind, v.Text))
                            .FirstOrDefault() ?? new FeatureValueDto(FeatureKind.NotIncluded, null))
                })
                .ToList()
        };
    }

    public async Task<ReviewsDto> GetReviewsAsync(CancellationToken cancellationToken = default)
    {
        var items = await db.Reviews
            .Where(r => r.IsPublished)
            .OrderByDescending(r => r.CreatedAt)
            .ThenByDescending(r => r.Id)
            .Select(r => new ReviewDto(r.Id, r.Author, r.Text, r.Rating))
            .ToListAsync(cancellationToken);

        var average = items.Count == 0
            ? 0m
            : Math.Round((decimal)items.Average(r => r.Rating), 1, MidpointRounding.AwayFromZero);

        return new ReviewsDto { Average = average, Items = items };
    }

    public async Task<IReadOnlyList<FaqTopicDto>> GetFaqAsync(string? search, CancellationToken cancellationToken = default)
    {
        var query = db.FaqItems.Where(i => i.IsPublished);

        var term = search?.Trim();
        if (!string.IsNullOrEmpty(term))
        {
            var lowered = term.ToLower();
            query = query.Where(i => i.Question.ToLower().Contains(lowered) || i.Answer.ToLower().Contains(lowered));
        }

        var rows = await query
            .OrderBy(i => i.Topic.SortOrder)
            .ThenBy(i => i.Topic.Name)
            .ThenBy(i => i.SortOrder)
            .ThenBy(i => i.Id)
            .Select(i => new
            {
                i.TopicId,
                TopicName = i.Topic.Name,
                i.Id,
                i.Question,
                i.Answer
            })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(r => new { r.TopicId, r.TopicName })
            .Select(g => new FaqTopicDto
            {
                Id = g.Key.TopicId,
                Name = g.Key.TopicName,
                Items = g.Select(r => new FaqItemDto(r.Id, r.Question, r.Answer)).ToList()
            })
            .ToList();
    }

    public async Task<ContactResult> SendContactAsync(ContactInput input, CancellationToken cancellationToken = default)
    {
        var message = new ContactMessage
        {
            Id = Guid.CreateVersion7(),
            Name = input.Name.Trim(),
            Email = input.Email.Trim(),
            Topic = input.Topic.Trim(),
            Message = input.Message.Trim(),
            CreatedAt = timeProvider.GetUtcNow()
        };
        db.ContactMessages.Add(message);
        await db.SaveChangesAsync(cancellationToken);

        return new ContactResult(message.Id);
    }
}
