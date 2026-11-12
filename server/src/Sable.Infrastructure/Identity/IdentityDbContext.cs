using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Sable.Infrastructure.Identity;

public class IdentityDbContext(DbContextOptions<IdentityDbContext> options)
    : Microsoft.AspNetCore.Identity.EntityFrameworkCore.IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Identity maps its tables with explicit PascalCase names, which the naming convention leaves untouched.
        builder.Entity<AppUser>().ToTable("asp_net_users");
        builder.Entity<IdentityRole<Guid>>().ToTable("asp_net_roles");
        builder.Entity<IdentityUserRole<Guid>>().ToTable("asp_net_user_roles");
        builder.Entity<IdentityUserClaim<Guid>>().ToTable("asp_net_user_claims");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("asp_net_user_logins");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("asp_net_user_tokens");
        builder.Entity<IdentityRoleClaim<Guid>>().ToTable("asp_net_role_claims");

        builder.Entity<AppUser>().HasIndex(u => u.NormalizedUserName).HasDatabaseName("ix_asp_net_users_normalized_user_name");
        builder.Entity<AppUser>().HasIndex(u => u.NormalizedEmail).HasDatabaseName("ix_asp_net_users_normalized_email");
        builder.Entity<IdentityRole<Guid>>().HasIndex(r => r.NormalizedName).HasDatabaseName("ix_asp_net_roles_normalized_name");

        builder.ApplyConfigurationsFromAssembly(
            typeof(IdentityDbContext).Assembly,
            t => t.Namespace!.StartsWith("Sable.Infrastructure.Identity", StringComparison.Ordinal));
    }
}
