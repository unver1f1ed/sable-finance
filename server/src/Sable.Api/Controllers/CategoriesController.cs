using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sable.Application.Abstractions;
using Sable.Application.Categories;
using Sable.Domain.Enums;

namespace Sable.Api.Controllers;

[Route("api/categories")]
[Authorize]
public class CategoriesController(ICategoryService categories, ICurrentUser currentUser) : ApiControllerBase(currentUser)
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> List([FromQuery] TransactionType? type, CancellationToken ct) =>
        Ok(await categories.ListAsync(type, ct));

    [HttpPost]
    public async Task<ActionResult<CategoryDto>> Create(CategoryInput input, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await categories.CreateAsync(input, ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CategoryDto>> Update(Guid id, CategoryInput input, CancellationToken ct) =>
        await categories.UpdateAsync(id, input, ct);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await categories.DeleteAsync(id, ct);
        return NoContent();
    }
}
