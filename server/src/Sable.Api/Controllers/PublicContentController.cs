using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sable.Application.Abstractions;
using Sable.Application.Content;

namespace Sable.Api.Controllers;

[Route("api")]
[AllowAnonymous]
public class PublicContentController(IPublicContentService content, ICurrentUser currentUser)
    : ApiControllerBase(currentUser)
{
    [HttpGet("plans")]
    [ResponseCache(Duration = 60)]
    public async Task<ActionResult<PlanComparisonDto>> Plans(CancellationToken ct) =>
        await content.GetPlansAsync(ct);

    [HttpGet("reviews")]
    [ResponseCache(Duration = 60)]
    public async Task<ActionResult<ReviewsDto>> Reviews(CancellationToken ct) =>
        await content.GetReviewsAsync(ct);

    [HttpGet("faq")]
    [ResponseCache(Duration = 60)]
    public async Task<ActionResult<IReadOnlyList<FaqTopicDto>>> Faq([FromQuery] string? search, CancellationToken ct) =>
        Ok(await content.GetFaqAsync(search, ct));

    [HttpPost("contact")]
    public async Task<ActionResult<ContactResult>> Contact(ContactInput input, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await content.SendContactAsync(input, ct));
}
