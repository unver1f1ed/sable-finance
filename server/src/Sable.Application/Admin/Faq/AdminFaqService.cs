using Microsoft.EntityFrameworkCore;
using Sable.Application.Abstractions;
using Sable.Application.Common;
using Sable.Domain.Entities;

namespace Sable.Application.Admin.Faq;

public class AdminFaqService(IFinanceDbContext db, TimeProvider timeProvider) : IAdminFaqService
{
    private static AdminFaqItemDto ToItemDto(FaqItem i) => new()
    {
        Id = i.Id,
        TopicId = i.TopicId,
        TopicName = i.Topic.Name,
        Question = i.Question,
        Answer = i.Answer,
        IsPublished = i.IsPublished,
        SortOrder = i.SortOrder,
        UpdatedAt = i.UpdatedAt.UtcDateTime
    };

    public async Task<IReadOnlyList<AdminFaqTopicDto>> ListTopicsAsync(CancellationToken cancellationToken = default) =>
        await db.FaqTopics
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.Id)
            .Select(t => new AdminFaqTopicDto(t.Id, t.Name, t.SortOrder, t.Items.Count()))
            .ToListAsync(cancellationToken);

    public async Task<AdminFaqTopicDto> CreateTopicAsync(
        AdminFaqTopicInput input,
        CancellationToken cancellationToken = default)
    {
        var name = input.Name.Trim();
        var lowered = name.ToLower();
        if (await db.FaqTopics.AnyAsync(t => t.Name.ToLower() == lowered, cancellationToken))
        {
            throw Errors.Conflict(ValidationMessages.DuplicateTopic);
        }

        var last = await db.FaqTopics.MaxAsync(t => (int?)t.SortOrder, cancellationToken) ?? 0;
        var topic = new FaqTopic { Id = Guid.CreateVersion7(), Name = name, SortOrder = last + 1 };
        db.FaqTopics.Add(topic);
        await db.SaveChangesAsync(cancellationToken);

        return new AdminFaqTopicDto(topic.Id, topic.Name, topic.SortOrder, 0);
    }

    public async Task DeleteTopicAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var topic = await db.FaqTopics.FirstOrDefaultAsync(t => t.Id == id, cancellationToken)
            ?? throw Errors.NotFound();

        if (await db.FaqItems.AnyAsync(i => i.TopicId == id, cancellationToken))
        {
            throw Errors.Conflict(ValidationMessages.TopicHasItems);
        }

        db.FaqTopics.Remove(topic);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AdminFaqItemDto>> ListItemsAsync(
        AdminFaqItemQuery query,
        CancellationToken cancellationToken = default)
    {
        var filtered = db.FaqItems.AsQueryable();

        var search = query.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
        {
            var lowered = search.ToLower();
            filtered = filtered.Where(i => i.Question.ToLower().Contains(lowered) || i.Answer.ToLower().Contains(lowered));
        }

        if (query.TopicId is { } topicId)
        {
            filtered = filtered.Where(i => i.TopicId == topicId);
        }

        var items = await filtered
            .Include(i => i.Topic)
            .OrderBy(i => i.Topic.SortOrder)
            .ThenBy(i => i.Topic.Id)
            .ThenBy(i => i.SortOrder)
            .ThenBy(i => i.Id)
            .ToListAsync(cancellationToken);

        return items.Select(ToItemDto).ToList();
    }

    public async Task<AdminFaqItemDto> CreateItemAsync(
        AdminFaqItemInput input,
        CancellationToken cancellationToken = default)
    {
        await EnsureTopicExistsAsync(input.TopicId, cancellationToken);

        var item = new FaqItem { Id = Guid.CreateVersion7() };
        item.SortOrder = await NextSortOrderAsync(input.TopicId, cancellationToken);
        Apply(item, input);
        db.FaqItems.Add(item);
        await db.SaveChangesAsync(cancellationToken);

        return await GetItemDtoAsync(item.Id, cancellationToken);
    }

    public async Task<AdminFaqItemDto> UpdateItemAsync(
        Guid id,
        AdminFaqItemInput input,
        CancellationToken cancellationToken = default)
    {
        var item = await db.FaqItems.FirstOrDefaultAsync(i => i.Id == id, cancellationToken)
            ?? throw Errors.NotFound();
        await EnsureTopicExistsAsync(input.TopicId, cancellationToken);

        if (item.TopicId != input.TopicId)
        {
            item.SortOrder = await NextSortOrderAsync(input.TopicId, cancellationToken);
        }

        Apply(item, input);
        await db.SaveChangesAsync(cancellationToken);

        return await GetItemDtoAsync(id, cancellationToken);
    }

    public async Task DeleteItemAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await db.FaqItems.FirstOrDefaultAsync(i => i.Id == id, cancellationToken)
            ?? throw Errors.NotFound();

        db.FaqItems.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
    }

    private void Apply(FaqItem item, AdminFaqItemInput input)
    {
        item.TopicId = input.TopicId;
        item.Question = input.Question.Trim();
        item.Answer = input.Answer.Trim();
        item.IsPublished = input.IsPublished;
        item.UpdatedAt = timeProvider.GetUtcNow();
    }

    private async Task EnsureTopicExistsAsync(Guid topicId, CancellationToken cancellationToken)
    {
        if (!await db.FaqTopics.AnyAsync(t => t.Id == topicId, cancellationToken))
        {
            throw Errors.Validation("topicId", ValidationMessages.TopicNotFound);
        }
    }

    private async Task<int> NextSortOrderAsync(Guid topicId, CancellationToken cancellationToken) =>
        (await db.FaqItems.Where(i => i.TopicId == topicId).MaxAsync(i => (int?)i.SortOrder, cancellationToken) ?? 0) + 1;

    private async Task<AdminFaqItemDto> GetItemDtoAsync(Guid id, CancellationToken cancellationToken) =>
        ToItemDto(await db.FaqItems.Include(i => i.Topic).SingleAsync(i => i.Id == id, cancellationToken));
}
