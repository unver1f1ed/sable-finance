using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Sable.Application.Abstractions;
using Sable.Application.Common;
using Sable.Domain.Entities;
using Sable.Domain.Enums;

namespace Sable.Application.Categories;

public class CategoryService(IFinanceDbContext db, ICurrentUser currentUser) : ICategoryService
{
    private const string DuplicateNameMessage = "Категорія з такою назвою вже існує";
    private const string TypeInUseMessage = "Тип категорії не можна змінити, поки вона використовується";
    private const string InUseMessage = "Категорія використовується в транзакціях або бюджеті";

    private static readonly Expression<Func<Category, CategoryDto>> ToDto = c => new CategoryDto
    {
        Id = c.Id,
        Name = c.Name,
        Type = c.Type,
        Icon = c.Icon,
        Color = c.Color,
        IsSystem = c.UserId == null,
        IsGoalContribution = c.IsGoalContribution
    };

    public async Task<IReadOnlyList<CategoryDto>> ListAsync(
        TransactionType? type,
        CancellationToken cancellationToken = default)
    {
        var query = db.Categories.AsQueryable();
        if (type is not null)
        {
            query = query.Where(c => c.Type == type);
        }

        return await query
            .OrderBy(c => c.UserId == null ? 0 : 1)
            .ThenBy(c => c.Name)
            .ThenBy(c => c.Id)
            .Select(ToDto)
            .ToListAsync(cancellationToken);
    }

    public async Task<CategoryDto> CreateAsync(CategoryInput input, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();
        var name = input.Name.Trim();

        await EnsureNameIsFreeAsync(name, input.Type, null, cancellationToken);

        var category = new Category
        {
            Id = Guid.CreateVersion7(),
            UserId = userId,
            Name = name,
            Type = input.Type,
            Icon = input.Icon,
            Color = CategoryPalette.NormalizeColor(input.Color),
            IsGoalContribution = false
        };
        db.Categories.Add(category);
        await db.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(category.Id, cancellationToken);
    }

    public async Task<CategoryDto> UpdateAsync(Guid id, CategoryInput input, CancellationToken cancellationToken = default)
    {
        var category = await FindOwnAsync(id, cancellationToken);
        var name = input.Name.Trim();

        await EnsureNameIsFreeAsync(name, input.Type, id, cancellationToken);

        if (input.Type != category.Type && await IsInUseAsync(id, cancellationToken))
        {
            throw Errors.Conflict(TypeInUseMessage);
        }

        category.Name = name;
        category.Type = input.Type;
        category.Icon = input.Icon;
        category.Color = CategoryPalette.NormalizeColor(input.Color);
        await db.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var category = await FindOwnAsync(id, cancellationToken);

        if (await IsInUseAsync(id, cancellationToken))
        {
            throw Errors.Conflict(InUseMessage);
        }

        db.Categories.Remove(category);
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<Category> FindOwnAsync(Guid id, CancellationToken cancellationToken) =>
        await db.Categories.FirstOrDefaultAsync(c => c.Id == id && c.UserId != null, cancellationToken)
        ?? throw Errors.NotFound();

    private async Task<bool> IsInUseAsync(Guid id, CancellationToken cancellationToken) =>
        await db.Transactions.AnyAsync(t => t.CategoryId == id, cancellationToken)
        || await db.Budgets.AnyAsync(b => b.CategoryId == id, cancellationToken);

    private async Task EnsureNameIsFreeAsync(
        string name,
        TransactionType type,
        Guid? excludeId,
        CancellationToken cancellationToken)
    {
        var lowered = name.ToLower();
        var taken = await db.Categories.AnyAsync(
            c => c.Type == type && c.Name.ToLower() == lowered && (excludeId == null || c.Id != excludeId),
            cancellationToken);
        if (taken)
        {
            throw Errors.Conflict(DuplicateNameMessage);
        }
    }

    private Task<CategoryDto> GetDtoAsync(Guid id, CancellationToken cancellationToken) =>
        db.Categories.Where(c => c.Id == id).Select(ToDto).SingleAsync(cancellationToken);
}
