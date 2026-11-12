using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Sable.Infrastructure.Identity;

internal sealed class TokenService(IdentityDbContext db, IOptions<JwtOptions> options)
{
    private readonly JwtOptions _options = options.Value;

    public string CreateAccessToken(AppUser user, IList<string> roles, out DateTimeOffset expiresAt)
    {
        var now = DateTimeOffset.UtcNow;
        expiresAt = now.AddMinutes(_options.AccessTokenMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.GivenName, user.FirstName),
            new("plan", user.PlanCode),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        claims.AddRange(roles.Select(role => new Claim("role", role)));

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            _options.Issuer,
            _options.Audience,
            claims,
            notBefore: now.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<string> CreateRefreshTokenAsync(Guid userId)
    {
        var raw = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(64));
        var now = DateTimeOffset.UtcNow;

        db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.CreateVersion7(),
            UserId = userId,
            TokenHash = Hash(raw),
            CreatedAt = now,
            ExpiresAt = now.AddDays(_options.RefreshTokenDays)
        });
        await db.SaveChangesAsync();

        return raw;
    }

    public async Task<RefreshToken?> FindActiveAsync(string rawToken)
    {
        var hash = Hash(rawToken);
        var now = DateTimeOffset.UtcNow;

        return await db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hash && t.RevokedAt == null && t.ExpiresAt > now);
    }

    /// <returns>False when the token was already revoked, for example by a concurrent request.</returns>
    public async Task<bool> RevokeAsync(RefreshToken token)
    {
        var now = DateTimeOffset.UtcNow;
        var updated = await db.RefreshTokens
            .Where(t => t.Id == token.Id && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now));
        return updated == 1;
    }

    public async Task RevokeAllAsync(Guid userId)
    {
        var now = DateTimeOffset.UtcNow;
        await db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now));
    }

    private static string Hash(string rawToken) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
}
