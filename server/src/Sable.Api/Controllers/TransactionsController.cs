using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sable.Application.Abstractions;
using Sable.Application.Transactions;

namespace Sable.Api.Controllers;

[Route("api/transactions")]
[Authorize]
public class TransactionsController(ITransactionService transactions, ICurrentUser currentUser)
    : ApiControllerBase(currentUser)
{
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TransactionDto>> Get(Guid id, CancellationToken ct) =>
        await transactions.GetAsync(id, ct);

    [HttpPost]
    public async Task<ActionResult<TransactionDto>> Create(TransactionInput input, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await transactions.CreateAsync(input, ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TransactionDto>> Update(Guid id, TransactionInput input, CancellationToken ct) =>
        await transactions.UpdateAsync(id, input, ct);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await transactions.DeleteAsync(id, ct);
        return NoContent();
    }
}
