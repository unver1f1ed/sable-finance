using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Sable.Application.Admin.Users;
using Sable.Infrastructure.Finance;
using Sable.Tests.Auth;
using Sable.Tests.Finance;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Admin;

[Collection(ApiCollection.Name)]
public class AdminUserTests(ApiFactory factory)
{
    private readonly ApiClient _api = new(factory);

    [Fact]
    public async Task List_contains_a_new_user_and_supports_filters_and_paging()
    {
        var admin = await _api.LoginAsAdminAsync();
        var tag = Guid.NewGuid().ToString("N")[..10];
        var start = await _api.RegisterAsync($"a-{tag}@test.ua", planCode: "start");
        var plus = await _api.RegisterAsync($"b-{tag}@test.ua", planCode: "plus");
        var plusUser = await admin.Client.FindAdminUserAsync(plus.Email);
        await admin.Client.UpdateUserAsync(plusUser, isBlocked: true);

        var all = await admin.Client.GetAdminUsersAsync($"?search={tag}");
        var upper = await admin.Client.GetAdminUsersAsync($"?search={tag.ToUpperInvariant()}");
        var onPlus = await admin.Client.GetAdminUsersAsync($"?search={tag}&planCode=plus");
        var blocked = await admin.Client.GetAdminUsersAsync($"?search={tag}&status=blocked");
        var active = await admin.Client.GetAdminUsersAsync($"?search={tag}&status=active");
        var admins = await admin.Client.GetAdminUsersAsync($"?search={tag}&role=Admin");
        var byName = await admin.Client.GetAdminUsersAsync($"?search={tag}&sort=name_asc");
        var oldestFirst = await admin.Client.GetAdminUsersAsync($"?search={tag}&sort=created_asc");
        var newestFirst = await admin.Client.GetAdminUsersAsync($"?search={tag}");
        var beyond = await admin.Client.GetAdminUsersAsync($"?search={tag}&page=5");

        Assert.Equal(2, all.Total);
        Assert.Equal(2, upper.Total);
        Assert.Equal(plus.Email, Assert.Single(onPlus.Items).Email);
        Assert.Equal(plus.Email, Assert.Single(blocked.Items).Email);
        Assert.Equal(start.Email, Assert.Single(active.Items).Email);
        Assert.Empty(admins.Items);
        Assert.Equal(2, byName.Items.Count);
        Assert.Equal(start.Email, oldestFirst.Items[0].Email);
        Assert.Equal(plus.Email, newestFirst.Items[0].Email);
        Assert.Empty(beyond.Items);
        Assert.Equal(2, beyond.Total);
        Assert.Equal(10, all.PageSize);
        Assert.Equal("User", all.Items[0].Role);
    }

    [Fact]
    public async Task List_reports_the_transaction_count_of_each_user()
    {
        var admin = await _api.LoginAsAdminAsync();
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var category = await user.Client.GetSystemCategoryAsync("Продукти");
        for (var i = 0; i < 3; i++)
        {
            await user.Client.CreateTransactionAsync(account.Id, category.Id);
        }

        var found = await admin.Client.FindAdminUserAsync(user.Email);

        Assert.Equal(3, found.TransactionCount);
    }

    [Theory]
    [InlineData("role=Owner", "role")]
    [InlineData("status=gone", "status")]
    [InlineData("sort=random", "sort")]
    [InlineData("planCode=gold", "planCode")]
    [InlineData("pageSize=7", "pageSize")]
    public async Task Invalid_filters_are_rejected(string query, string field)
    {
        var admin = await _api.LoginAsAdminAsync();

        var response = await admin.Client.GetAsync("/api/admin/users?" + query);

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", field);
    }

    [Fact]
    public async Task Stats_change_after_a_plus_user_adds_a_transaction_this_month()
    {
        var admin = await _api.LoginAsAdminAsync();
        var before = await admin.Client.GetAdminStatsAsync();

        var user = await _api.RegisterAsync(planCode: "plus");
        var account = await user.Client.CreateAccountAsync();
        var category = await user.Client.GetSystemCategoryAsync("Продукти");
        await user.Client.CreateTransactionAsync(account.Id, category.Id);
        var after = await admin.Client.GetAdminStatsAsync();

        Assert.Equal(before.Total + 1, after.Total);
        Assert.Equal(before.OnPlus + 1, after.OnPlus);
        Assert.Equal(before.ActiveThisMonth + 1, after.ActiveThisMonth);
        Assert.Equal(before.Blocked, after.Blocked);
    }

    [Fact]
    public async Task Blocking_stops_login_and_refresh_and_unblocking_restores_login()
    {
        var admin = await _api.LoginAsAdminAsync();
        var user = await _api.RegisterAsync();
        var dto = await admin.Client.FindAdminUserAsync(user.Email);
        var statsBefore = await admin.Client.GetAdminStatsAsync();

        var block = await admin.Client.UpdateUserAsync(dto, isBlocked: true);

        Assert.Equal(HttpStatusCode.OK, block.StatusCode);
        Assert.True((await block.ReadAsync<AdminUserDto>()).IsBlocked);
        await (await _api.LoginAsync(user.Email, user.Password))
            .AssertProblemAsync(HttpStatusCode.Forbidden, "account_blocked");
        var refresh = await _api.RefreshAsync(user.Auth.RefreshToken);
        Assert.True(refresh.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden);
        Assert.Equal(statsBefore.Blocked + 1, (await admin.Client.GetAdminStatsAsync()).Blocked);

        var unblock = await admin.Client.UpdateUserAsync(dto, isBlocked: false);

        Assert.False((await unblock.ReadAsync<AdminUserDto>()).IsBlocked);
        Assert.Equal(HttpStatusCode.OK, (await _api.LoginAsync(user.Email, user.Password)).StatusCode);
    }

    [Fact]
    public async Task Promoting_and_demoting_changes_access_after_a_new_login()
    {
        var admin = await _api.LoginAsAdminAsync();
        var user = await _api.RegisterAsync();
        var dto = await admin.Client.FindAdminUserAsync(user.Email);

        var promote = await admin.Client.UpdateUserAsync(dto, role: "Admin");
        Assert.Equal("Admin", (await promote.ReadAsync<AdminUserDto>()).Role);
        var promoted = await _api.LoginUserAsync(user.Email, user.Password);
        Assert.Contains("Admin", promoted.Auth.User.Roles);
        Assert.Equal(HttpStatusCode.OK, (await promoted.Client.GetAsync("/api/admin/users/stats")).StatusCode);

        var demote = await admin.Client.UpdateUserAsync(dto, role: "User");
        Assert.Equal("User", (await demote.ReadAsync<AdminUserDto>()).Role);
        var demoted = await _api.LoginUserAsync(user.Email, user.Password);
        Assert.DoesNotContain("Admin", demoted.Auth.User.Roles);
        Assert.Contains("User", demoted.Auth.User.Roles);
        await (await demoted.Client.GetAsync("/api/admin/users/stats"))
            .AssertProblemAsync(HttpStatusCode.Forbidden, "forbidden");
    }

    [Fact]
    public async Task Changing_the_plan_is_visible_to_the_user_after_a_refresh()
    {
        var admin = await _api.LoginAsAdminAsync();
        var user = await _api.RegisterAsync(planCode: "start");
        var dto = await admin.Client.FindAdminUserAsync(user.Email);

        var update = await admin.Client.UpdateUserAsync(dto, planCode: "plus", firstName: "Нове ім’я");

        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var refreshed = await (await _api.RefreshAsync(user.Auth.RefreshToken)).ReadAsync<Sable.Application.Auth.AuthResponse>();
        Assert.Equal("plus", refreshed.User.PlanCode);
        Assert.Equal("plus", ApiClient.DecodeJwtPayload(refreshed.AccessToken).GetProperty("plan").GetString());
        var me = await (await _api.Authorized(refreshed.AccessToken).GetAsync("/api/me")).ReadAsync<Sable.Application.Auth.UserDto>();
        Assert.Equal("plus", me.PlanCode);
        Assert.Equal("Нове ім’я", me.FirstName);
    }

    [Fact]
    public async Task Update_with_an_unknown_plan_or_role_is_rejected()
    {
        var admin = await _api.LoginAsAdminAsync();
        var user = await _api.RegisterAsync();
        var dto = await admin.Client.FindAdminUserAsync(user.Email);

        var unknownPlan = await admin.Client.UpdateUserAsync(dto, planCode: "gold");
        var unknownRole = await admin.Client.UpdateUserAsync(dto, role: "Owner");

        await unknownPlan.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "planCode");
        await unknownRole.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "role");
    }

    [Fact]
    public async Task Admin_cannot_block_demote_or_delete_themself_but_may_rename_themself()
    {
        var root = await _api.LoginAsAdminAsync();
        var user = await _api.RegisterAsync();
        var dto = await root.Client.FindAdminUserAsync(user.Email);
        await root.Client.UpdateUserAsync(dto, role: "Admin");
        var second = await _api.LoginUserAsync(user.Email, user.Password);
        var self = await second.Client.FindAdminUserAsync(user.Email);

        var block = await second.Client.UpdateUserAsync(self, isBlocked: true);
        var demote = await second.Client.UpdateUserAsync(self, role: "User");
        var delete = await second.Client.DeleteAsync($"/api/admin/users/{self.Id}");
        var rename = await second.Client.UpdateUserAsync(self, firstName: "Інше");

        await block.AssertProblemAsync(HttpStatusCode.Conflict, "conflict");
        await demote.AssertProblemAsync(HttpStatusCode.Conflict, "conflict");
        await delete.AssertProblemAsync(HttpStatusCode.Conflict, "conflict");
        Assert.Equal(HttpStatusCode.OK, rename.StatusCode);
        Assert.Equal("Інше", (await rename.ReadAsync<AdminUserDto>()).FirstName);
    }

    [Fact]
    public async Task Unknown_user_id_returns_not_found()
    {
        var admin = await _api.LoginAsAdminAsync();
        var user = await _api.RegisterAsync();
        var dto = await admin.Client.FindAdminUserAsync(user.Email);

        var update = await admin.Client.PutJsonAsync($"/api/admin/users/{Guid.NewGuid()}", new
        {
            firstName = dto.FirstName,
            lastName = dto.LastName,
            role = "User",
            planCode = "start",
            isBlocked = false
        });
        var delete = await admin.Client.DeleteAsync($"/api/admin/users/{Guid.NewGuid()}");

        await update.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
        await delete.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
    }

    [Fact]
    public async Task Deleting_a_user_removes_the_account_and_the_finance_data()
    {
        var admin = await _api.LoginAsAdminAsync();
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var category = await user.Client.GetSystemCategoryAsync("Продукти");
        await user.Client.CreateTransactionAsync(account.Id, category.Id);
        await user.Client.CreateGoalAsync();
        var dto = await admin.Client.FindAdminUserAsync(user.Email);
        Assert.Equal(1, dto.TransactionCount);

        var delete = await admin.Client.DeleteAsync($"/api/admin/users/{dto.Id}");

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        await (await _api.LoginAsync(user.Email, user.Password))
            .AssertProblemAsync(HttpStatusCode.Unauthorized, "invalid_credentials");
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FinanceDbContext>();
        Assert.Equal(0, await db.Accounts.IgnoreQueryFilters().CountAsync(a => a.UserId == dto.Id));
        Assert.Equal(0, await db.Transactions.IgnoreQueryFilters().CountAsync(t => t.UserId == dto.Id));
        Assert.Equal(0, await db.Goals.IgnoreQueryFilters().CountAsync(g => g.UserId == dto.Id));
    }
}
