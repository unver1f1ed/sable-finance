using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sable.Application.Abstractions;
using Sable.Application.Admin.Faq;
using Sable.Application.Auth;

namespace Sable.Api.Controllers;

[Route("api/admin/faq")]
[Authorize(Roles = Roles.Admin)]
public class AdminFaqController(IAdminFaqService faq, ICurrentUser currentUser) : ApiControllerBase(currentUser)
{
    [HttpGet("topics")]
    public async Task<ActionResult<IReadOnlyList<AdminFaqTopicDto>>> ListTopics(CancellationToken ct) =>
        Ok(await faq.ListTopicsAsync(ct));

    [HttpPost("topics")]
    public async Task<ActionResult<AdminFaqTopicDto>> CreateTopic(AdminFaqTopicInput input, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await faq.CreateTopicAsync(input, ct));

    [HttpDelete("topics/{id:guid}")]
    public async Task<IActionResult> DeleteTopic(Guid id, CancellationToken ct)
    {
        await faq.DeleteTopicAsync(id, ct);
        return NoContent();
    }

    [HttpGet("items")]
    public async Task<ActionResult<IReadOnlyList<AdminFaqItemDto>>> ListItems(
        [FromQuery] AdminFaqItemQuery query,
        CancellationToken ct) =>
        Ok(await faq.ListItemsAsync(query, ct));

    [HttpPost("items")]
    public async Task<ActionResult<AdminFaqItemDto>> CreateItem(AdminFaqItemInput input, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await faq.CreateItemAsync(input, ct));

    [HttpPut("items/{id:guid}")]
    public async Task<ActionResult<AdminFaqItemDto>> UpdateItem(Guid id, AdminFaqItemInput input, CancellationToken ct) =>
        await faq.UpdateItemAsync(id, input, ct);

    [HttpDelete("items/{id:guid}")]
    public async Task<IActionResult> DeleteItem(Guid id, CancellationToken ct)
    {
        await faq.DeleteItemAsync(id, ct);
        return NoContent();
    }
}
