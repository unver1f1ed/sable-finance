namespace Sable.Application.Admin.Faq;

public interface IAdminFaqService
{
    Task<IReadOnlyList<AdminFaqTopicDto>> ListTopicsAsync(CancellationToken cancellationToken = default);
    Task<AdminFaqTopicDto> CreateTopicAsync(AdminFaqTopicInput input, CancellationToken cancellationToken = default);
    Task DeleteTopicAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AdminFaqItemDto>> ListItemsAsync(AdminFaqItemQuery query, CancellationToken cancellationToken = default);
    Task<AdminFaqItemDto> CreateItemAsync(AdminFaqItemInput input, CancellationToken cancellationToken = default);
    Task<AdminFaqItemDto> UpdateItemAsync(Guid id, AdminFaqItemInput input, CancellationToken cancellationToken = default);
    Task DeleteItemAsync(Guid id, CancellationToken cancellationToken = default);
}
