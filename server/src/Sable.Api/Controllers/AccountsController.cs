using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sable.Application.Abstractions;
using Sable.Application.Accounts;

namespace Sable.Api.Controllers;

[Route("api/accounts")]
[Authorize]
public class AccountsController(IAccountService accounts, ICurrentUser currentUser) : ApiControllerBase(currentUser)
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AccountDto>>> List(CancellationToken ct) =>
        Ok(await accounts.ListAsync(ct));

    [HttpPost]
    public async Task<ActionResult<AccountDto>> Create(AccountInput input, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await accounts.CreateAsync(input, ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AccountDto>> Update(Guid id, AccountInput input, CancellationToken ct) =>
        await accounts.UpdateAsync(id, input, ct);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await accounts.DeleteAsync(id, ct);
        return NoContent();
    }
}
