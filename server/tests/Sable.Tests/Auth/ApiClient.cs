using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Sable.Application.Auth;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Auth;

public sealed record RegisteredUser(AuthResponse Auth, HttpClient Client, string Email, string Password);

public sealed class ApiClient(ApiFactory factory)
{
    public const string DefaultPassword = "Passw0rd123";

    public static string UniqueEmail() => $"user-{Guid.NewGuid():N}@test.ua";

    public HttpClient Anonymous() => factory.CreateClient();

    public async Task<RegisteredUser> RegisterAsync(
        string? email = null,
        string password = DefaultPassword,
        string planCode = "start")
    {
        email ??= UniqueEmail();

        var anonymous = Anonymous();
        var response = await anonymous.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Тарас",
            lastName = "Шевченко",
            email,
            password,
            planCode
        });
        response.EnsureSuccessStatusCode();

        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        return new RegisteredUser(auth, Authorized(auth.AccessToken), email, password);
    }

    public HttpClient Authorized(string accessToken)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }

    public Task<HttpResponseMessage> LoginAsync(string email, string password) =>
        Anonymous().PostAsJsonAsync("/api/auth/login", new { email, password });

    /// <summary>Logs in as the admin seeded by <see cref="ApiFactory"/> and returns a client with its token.</summary>
    public Task<RegisteredUser> LoginAsAdminAsync() => LoginUserAsync(ApiFactory.AdminEmail, ApiFactory.AdminPassword);

    /// <summary>Logs in with valid credentials and returns the tokens together with an authorized client.</summary>
    public async Task<RegisteredUser> LoginUserAsync(string email, string password)
    {
        var response = await LoginAsync(email, password);
        response.EnsureSuccessStatusCode();
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        return new RegisteredUser(auth, Authorized(auth.AccessToken), email, password);
    }

    public Task<HttpResponseMessage> RefreshAsync(string refreshToken) =>
        Anonymous().PostAsJsonAsync("/api/auth/refresh", new { refreshToken });

    public static JsonElement DecodeJwtPayload(string jwt)
    {
        var payload = jwt.Split('.')[1].Replace('-', '+').Replace('_', '/');
        payload = payload.PadRight(payload.Length + (4 - payload.Length % 4) % 4, '=');
        return JsonDocument.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(payload))).RootElement;
    }
}
