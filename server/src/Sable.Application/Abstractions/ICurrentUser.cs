namespace Sable.Application.Abstractions;

public interface ICurrentUser
{
    Guid? UserId { get; }
}
