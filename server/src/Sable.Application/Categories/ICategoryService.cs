using Sable.Domain.Enums;

namespace Sable.Application.Categories;

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryDto>> ListAsync(TransactionType? type, CancellationToken cancellationToken = default);
    Task<CategoryDto> CreateAsync(CategoryInput input, CancellationToken cancellationToken = default);
    Task<CategoryDto> UpdateAsync(Guid id, CategoryInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
