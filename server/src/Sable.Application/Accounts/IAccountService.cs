namespace Sable.Application.Accounts;

public interface IAccountService
{
    Task<IReadOnlyList<AccountDto>> ListAsync(CancellationToken cancellationToken = default);
    Task<AccountDto> CreateAsync(AccountInput input, CancellationToken cancellationToken = default);
    Task<AccountDto> UpdateAsync(Guid id, AccountInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
