namespace Sable.Application.Content;

public interface IPublicContentService
{
    Task<PlanComparisonDto> GetPlansAsync(CancellationToken cancellationToken = default);
    Task<ReviewsDto> GetReviewsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FaqTopicDto>> GetFaqAsync(string? search, CancellationToken cancellationToken = default);
    Task<ContactResult> SendContactAsync(ContactInput input, CancellationToken cancellationToken = default);
}
