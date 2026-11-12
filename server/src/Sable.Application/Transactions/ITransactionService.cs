namespace Sable.Application.Transactions;

public interface ITransactionService
{
    Task<TransactionList> ListAsync(TransactionQuery query, CancellationToken cancellationToken = default);
    Task<TransactionExport> ExportAsync(TransactionQuery query, CancellationToken cancellationToken = default);
    Task<TransactionDto> GetAsync(Guid id, CancellationToken cancellationToken = default);
    Task<TransactionDto> CreateAsync(TransactionInput input, CancellationToken cancellationToken = default);
    Task<TransactionDto> UpdateAsync(Guid id, TransactionInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
