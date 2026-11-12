namespace Sable.Application.Common;

public interface IUserDataEraser
{
    Task EraseAsync(Guid userId, CancellationToken cancellationToken = default);
}
