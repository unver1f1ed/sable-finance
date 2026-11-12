namespace Sable.Application.Transactions;

public interface ITransactionService
{
    Task<TransactionDto> GetAsync(Guid id, CancellationToken cancellationToken = default);
    Task<TransactionDto> CreateAsync(TransactionInput input, CancellationToken cancellationToken = default);
    Task<TransactionDto> UpdateAsync(Guid id, TransactionInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
