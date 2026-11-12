using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Sable.Application.Auth;
using Sable.Infrastructure.Identity;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Auth;

[Collection(ApiCollection.Name)]
public class AuthTests(ApiFactory factory)
{
    private readonly ApiClient _api = new(factory);

    [Fact]
    public async Task Register_with_valid_data_returns_tokens_and_user_role()
    {
        var email = ApiClient.UniqueEmail();

        var response = await _api.Anonymous().PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Ірина",
            lastName = "Коваль",
            email,
            password = "Passw0rd123",
            planCode = "plus"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        Assert.False(string.IsNullOrEmpty(auth.AccessToken));
        Assert.False(string.IsNullOrEmpty(auth.RefreshToken));
        Assert.Equal(email, auth.User.Email);
        Assert.Equal(["User"], auth.User.Roles);
        Assert.Equal("plus", auth.User.PlanCode);
    }

    [Fact]
    public async Task Register_with_taken_email_in_other_letter_case_returns_conflict()
    {
        var email = ApiClient.UniqueEmail();
        await _api.RegisterAsync(email);

        var response = await _api.Anonymous().PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Тарас",
            lastName = "Шевченко",
            email = email.ToUpperInvariant(),
            password = ApiClient.DefaultPassword,
            planCode = "start"
        });

        await AssertErrorAsync(response, HttpStatusCode.Conflict, "email_taken");
    }

    [Theory]
    [InlineData("short1")]
    [InlineData("12345678")]
    public async Task Register_with_weak_password_returns_validation_error(string password)
    {
        var response = await _api.Anonymous().PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Тарас",
            lastName = "Шевченко",
            email = ApiClient.UniqueEmail(),
            password,
            planCode = "start"
        });

        var body = await AssertErrorAsync(response, HttpStatusCode.BadRequest, "validation_failed");
        Assert.True(body.GetProperty("errors").TryGetProperty("password", out var messages));
        Assert.Equal(PasswordAttribute.Message, messages[0].GetString());
    }

    [Fact]
    public async Task Register_with_invalid_email_returns_validation_error()
    {
        var response = await _api.Anonymous().PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Тарас",
            lastName = "Шевченко",
            email = "not-an-email",
            password = ApiClient.DefaultPassword,
            planCode = "start"
        });

        var body = await AssertErrorAsync(response, HttpStatusCode.BadRequest, "validation_failed");
        Assert.True(body.GetProperty("errors").TryGetProperty("email", out _));
    }

    [Fact]
    public async Task Register_with_unknown_plan_returns_validation_error()
    {
        var response = await _api.Anonymous().PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Тарас",
            lastName = "Шевченко",
            email = ApiClient.UniqueEmail(),
            password = ApiClient.DefaultPassword,
            planCode = "gold"
        });

        var body = await AssertErrorAsync(response, HttpStatusCode.BadRequest, "validation_failed");
        Assert.True(body.GetProperty("errors").TryGetProperty("planCode", out _));
    }

    [Fact]
    public async Task Login_succeeds_with_correct_credentials_and_hides_which_part_was_wrong()
    {
        var user = await _api.RegisterAsync();

        var ok = await _api.LoginAsync(user.Email, user.Password);
        var wrongPassword = await _api.LoginAsync(user.Email, "Wrong-password-1");
        var unknownEmail = await _api.LoginAsync(ApiClient.UniqueEmail(), user.Password);

        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        var wrongBody = await AssertErrorAsync(wrongPassword, HttpStatusCode.Unauthorized, "invalid_credentials");
        var unknownBody = await AssertErrorAsync(unknownEmail, HttpStatusCode.Unauthorized, "invalid_credentials");
        Assert.Equal(wrongBody.GetProperty("detail").GetString(), unknownBody.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Me_without_token_returns_unauthorized_problem()
    {
        var response = await _api.Anonymous().GetAsync("/api/me");

        await AssertErrorAsync(response, HttpStatusCode.Unauthorized, "unauthorized");
    }

    [Fact]
    public async Task Me_with_malformed_token_returns_unauthorized_problem()
    {
        var response = await _api.Authorized("not.a.jwt").GetAsync("/api/me");

        await AssertErrorAsync(response, HttpStatusCode.Unauthorized, "unauthorized");
    }

    [Fact]
    public async Task Me_with_token_returns_current_user()
    {
        var user = await _api.RegisterAsync();

        var response = await user.Client.GetAsync("/api/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var me = (await response.Content.ReadFromJsonAsync<UserDto>())!;
        Assert.Equal(user.Email, me.Email);
        Assert.Equal(user.Auth.User.Id, me.Id);
    }

    [Fact]
    public async Task Admin_only_route_returns_forbidden_problem_for_regular_user()
    {
        var user = await _api.RegisterAsync();

        var response = await user.Client.GetAsync("/test-errors/admin-only");

        await AssertErrorAsync(response, HttpStatusCode.Forbidden, "forbidden");
    }

    [Fact]
    public async Task Admin_only_route_is_open_for_the_admin()
    {
        var admin = await LoginAsAdminAsync();

        var response = await _api.Authorized(admin.AccessToken).GetAsync("/test-errors/admin-only");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_issues_new_pair_and_rejects_the_old_refresh_token()
    {
        var user = await _api.RegisterAsync();

        var refreshed = await _api.RefreshAsync(user.Auth.RefreshToken);

        Assert.Equal(HttpStatusCode.OK, refreshed.StatusCode);
        var pair = (await refreshed.Content.ReadFromJsonAsync<AuthResponse>())!;
        Assert.NotEqual(user.Auth.RefreshToken, pair.RefreshToken);
        Assert.NotEqual(user.Auth.AccessToken, pair.AccessToken);

        var reused = await _api.RefreshAsync(user.Auth.RefreshToken);
        await AssertErrorAsync(reused, HttpStatusCode.Unauthorized, "invalid_refresh_token");

        var again = await _api.RefreshAsync(pair.RefreshToken);
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
    }

    [Fact]
    public async Task Refresh_with_unknown_token_returns_invalid_refresh_token()
    {
        var response = await _api.RefreshAsync("unknown-token");

        await AssertErrorAsync(response, HttpStatusCode.Unauthorized, "invalid_refresh_token");
    }

    [Fact]
    public async Task Logout_revokes_the_refresh_token_and_never_fails()
    {
        var user = await _api.RegisterAsync();

        var logout = await _api.Anonymous().PostAsJsonAsync("/api/auth/logout", new { refreshToken = user.Auth.RefreshToken });
        var unknown = await _api.Anonymous().PostAsJsonAsync("/api/auth/logout", new { refreshToken = "unknown-token" });
        var refresh = await _api.RefreshAsync(user.Auth.RefreshToken);

        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, unknown.StatusCode);
        await AssertErrorAsync(refresh, HttpStatusCode.Unauthorized, "invalid_refresh_token");
    }

    [Fact]
    public async Task Change_password_replaces_the_password_and_revokes_refresh_tokens()
    {
        var user = await _api.RegisterAsync();
        const string newPassword = "NewPassw0rd456";

        var response = await user.Client.PutAsJsonAsync("/api/me/password", new
        {
            currentPassword = user.Password,
            newPassword
        });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await AssertErrorAsync(await _api.LoginAsync(user.Email, user.Password), HttpStatusCode.Unauthorized, "invalid_credentials");
        Assert.Equal(HttpStatusCode.OK, (await _api.LoginAsync(user.Email, newPassword)).StatusCode);
        await AssertErrorAsync(await _api.RefreshAsync(user.Auth.RefreshToken), HttpStatusCode.Unauthorized, "invalid_refresh_token");
    }

    [Fact]
    public async Task Change_password_with_wrong_current_password_returns_validation_error()
    {
        var user = await _api.RegisterAsync();

        var response = await user.Client.PutAsJsonAsync("/api/me/password", new
        {
            currentPassword = "Wrong-password-1",
            newPassword = "NewPassw0rd456"
        });

        var body = await AssertErrorAsync(response, HttpStatusCode.BadRequest, "validation_failed");
        Assert.True(body.GetProperty("errors").TryGetProperty("currentPassword", out _));
    }

    [Fact]
    public async Task Change_plan_returns_tokens_with_the_new_plan_claim()
    {
        var user = await _api.RegisterAsync(planCode: "start");

        var response = await user.Client.PutAsJsonAsync("/api/me/plan", new { planCode = "plus" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        Assert.Equal("plus", auth.User.PlanCode);
        Assert.Equal("plus", ApiClient.DecodeJwtPayload(auth.AccessToken).GetProperty("plan").GetString());
        Assert.Equal(HttpStatusCode.OK, (await _api.RefreshAsync(user.Auth.RefreshToken)).StatusCode);
    }

    [Fact]
    public async Task Update_profile_changes_names_and_rejects_an_email_of_another_user()
    {
        var first = await _api.RegisterAsync();
        var second = await _api.RegisterAsync();
        var newEmail = ApiClient.UniqueEmail();

        var updated = await first.Client.PutAsJsonAsync("/api/me", new
        {
            firstName = "Олена",
            lastName = "Мельник",
            email = newEmail
        });
        var conflict = await first.Client.PutAsJsonAsync("/api/me", new
        {
            firstName = "Олена",
            lastName = "Мельник",
            email = second.Email
        });

        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        var me = (await updated.Content.ReadFromJsonAsync<UserDto>())!;
        Assert.Equal("Олена", me.FirstName);
        Assert.Equal(newEmail, me.Email);
        await AssertErrorAsync(conflict, HttpStatusCode.Conflict, "email_taken");
        Assert.Equal(HttpStatusCode.OK, (await _api.LoginAsync(newEmail, first.Password)).StatusCode);
    }

    [Fact]
    public async Task Blocked_user_cannot_log_in_or_refresh()
    {
        var user = await _api.RegisterAsync();
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
            var entity = (await users.FindByEmailAsync(user.Email))!;
            await users.SetLockoutEndDateAsync(entity, DateTimeOffset.MaxValue);
        }

        await AssertErrorAsync(await _api.LoginAsync(user.Email, user.Password), HttpStatusCode.Forbidden, "account_blocked");
        await AssertErrorAsync(await _api.RefreshAsync(user.Auth.RefreshToken), HttpStatusCode.Forbidden, "account_blocked");
    }

    [Fact]
    public async Task Password_is_stored_as_a_hash_and_refresh_token_only_as_a_digest()
    {
        var user = await _api.RegisterAsync();

        await using var connection = new NpgsqlConnection(factory.IdentityConnectionString);
        await connection.OpenAsync();

        await using var hashCommand = new NpgsqlCommand(
            "select password_hash from asp_net_users where normalized_email = @email", connection);
        hashCommand.Parameters.AddWithValue("email", user.Email.ToUpperInvariant());
        var hash = (string?)await hashCommand.ExecuteScalarAsync();

        Assert.False(string.IsNullOrEmpty(hash));
        Assert.DoesNotContain(user.Password, hash);

        await using var tokenCommand = new NpgsqlCommand(
            "select count(*) from refresh_tokens where token_hash = @raw", connection);
        tokenCommand.Parameters.AddWithValue("raw", user.Auth.RefreshToken);
        Assert.Equal(0L, (long)(await tokenCommand.ExecuteScalarAsync())!);
    }

    [Fact]
    public async Task Seeded_admin_can_log_in_and_has_admin_role()
    {
        var admin = await LoginAsAdminAsync();

        Assert.Contains("Admin", admin.User.Roles);
        Assert.Contains("User", admin.User.Roles);
        Assert.Equal("plus", admin.User.PlanCode);
    }

    [Fact]
    public async Task Delete_account_with_correct_password_removes_the_user()
    {
        var user = await _api.RegisterAsync();

        var wrong = await DeleteAccountAsync(user.Client, "Wrong-password-1");
        var deleted = await DeleteAccountAsync(user.Client, user.Password);

        await AssertErrorAsync(wrong, HttpStatusCode.BadRequest, "validation_failed");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        await AssertErrorAsync(await _api.LoginAsync(user.Email, user.Password), HttpStatusCode.Unauthorized, "invalid_credentials");
        await AssertErrorAsync(await _api.RefreshAsync(user.Auth.RefreshToken), HttpStatusCode.Unauthorized, "invalid_refresh_token");
    }

    private async Task<AuthResponse> LoginAsAdminAsync()
    {
        var response = await _api.LoginAsync(ApiFactory.AdminEmail, ApiFactory.AdminPassword);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
    }

    private static Task<HttpResponseMessage> DeleteAccountAsync(HttpClient client, string password) =>
        client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/me")
        {
            Content = JsonContent.Create(new { password })
        });

    private static async Task<JsonElement> AssertErrorAsync(
        HttpResponseMessage response,
        HttpStatusCode status,
        string code)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var body = (await response.Content.ReadFromJsonAsync<JsonElement>());
        Assert.Equal(code, body.GetProperty("code").GetString());
        return body;
    }
}
