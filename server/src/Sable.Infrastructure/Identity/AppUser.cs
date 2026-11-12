using Microsoft.AspNetCore.Identity;

namespace Sable.Infrastructure.Identity;

public class AppUser : IdentityUser<Guid>
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PlanCode { get; set; } = "start";
    public DateTimeOffset CreatedAt { get; set; }
}
