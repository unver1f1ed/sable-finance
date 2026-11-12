using System.Net;
using Sable.Tests.Auth;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Finance;

[Collection(ApiCollection.Name)]
public class CategoryTests(ApiFactory factory)
{
    private readonly ApiClient _api = new(factory);

    [Fact]
    public async Task List_contains_the_twelve_system_categories()
    {
        var user = await _api.RegisterAsync();

        var categories = await user.Client.GetCategoriesAsync();

        Assert.Equal(12, categories.Count);
        Assert.All(categories, c => Assert.True(c.IsSystem));
        Assert.Single(categories, c => c.IsGoalContribution);
        Assert.Equal("Внесок у ціль", categories.Single(c => c.IsGoalContribution).Name);
    }

    [Fact]
    public async Task List_can_be_filtered_by_type()
    {
        var user = await _api.RegisterAsync();

        var income = await user.Client.GetCategoriesAsync("Income");
        var expense = await user.Client.GetCategoriesAsync("expense");

        Assert.Equal(3, income.Count);
        Assert.All(income, c => Assert.Equal(Sable.Domain.Enums.TransactionType.Income, c.Type));
        Assert.Equal(9, expense.Count);
    }

    [Fact]
    public async Task List_shows_system_categories_first_and_hides_categories_of_other_users()
    {
        var owner = await _api.RegisterAsync();
        var stranger = await _api.RegisterAsync();
        await owner.Client.CreateCategoryAsync("Аааа власна");

        var ownList = await owner.Client.GetCategoriesAsync();
        var strangerList = await stranger.Client.GetCategoriesAsync();

        Assert.Equal(13, ownList.Count);
        Assert.False(ownList[^1].IsSystem);
        Assert.Equal("Аааа власна", ownList[^1].Name);
        Assert.Equal(12, strangerList.Count);
    }

    [Fact]
    public async Task Own_category_can_be_created_and_the_colour_is_stored_in_upper_case()
    {
        var user = await _api.RegisterAsync();

        var response = await user.Client.PostJsonAsync("/api/categories",
            new { name = "  Хобі ", type = "Expense", icon = "star", color = "#6fdbd4" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var category = await response.ReadAsync<Sable.Application.Categories.CategoryDto>();
        Assert.Equal("Хобі", category.Name);
        Assert.Equal("#6FDBD4", category.Color);
        Assert.False(category.IsSystem);
        Assert.False(category.IsGoalContribution);
    }

    [Fact]
    public async Task Name_of_a_system_category_cannot_be_reused_within_the_type()
    {
        var user = await _api.RegisterAsync();

        var duplicate = await user.Client.PostJsonAsync("/api/categories",
            new { name = "ПРОДУКТИ", type = "Expense", icon = "cart", color = "#6FDBD4" });
        var otherType = await user.Client.PostJsonAsync("/api/categories",
            new { name = "Продукти", type = "Income", icon = "cart", color = "#6FDBD4" });

        await duplicate.AssertProblemAsync(HttpStatusCode.Conflict, "conflict");
        Assert.Equal(HttpStatusCode.Created, otherType.StatusCode);
    }

    [Fact]
    public async Task System_category_cannot_be_updated_or_deleted()
    {
        var user = await _api.RegisterAsync();
        var system = await user.Client.GetSystemCategoryAsync("Житло");

        var update = await user.Client.PutJsonAsync($"/api/categories/{system.Id}",
            new { name = "Інша назва", type = "Expense", icon = "home", color = "#A78BFA" });
        var delete = await user.Client.DeleteAsync($"/api/categories/{system.Id}");

        await update.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
        await delete.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
    }

    [Fact]
    public async Task Category_of_another_user_is_not_found()
    {
        var owner = await _api.RegisterAsync();
        var stranger = await _api.RegisterAsync();
        var category = await owner.Client.CreateCategoryAsync("Приватна");

        var update = await stranger.Client.PutJsonAsync($"/api/categories/{category.Id}",
            new { name = "Чужа", type = "Expense", icon = "star", color = "#6FDBD4" });
        var delete = await stranger.Client.DeleteAsync($"/api/categories/{category.Id}");

        await update.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
        await delete.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
    }

    [Fact]
    public async Task Own_category_can_be_updated_and_deleted_while_unused()
    {
        var user = await _api.RegisterAsync();
        var category = await user.Client.CreateCategoryAsync("Стара назва");

        var update = await user.Client.PutJsonAsync($"/api/categories/{category.Id}",
            new { name = "Нова назва", type = "Income", icon = "gift", color = "#F472B6" });
        var delete = await user.Client.DeleteAsync($"/api/categories/{category.Id}");

        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var updated = await update.ReadAsync<Sable.Application.Categories.CategoryDto>();
        Assert.Equal("Нова назва", updated.Name);
        Assert.Equal(Sable.Domain.Enums.TransactionType.Income, updated.Type);
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.DoesNotContain(await user.Client.GetCategoriesAsync(), c => c.Id == category.Id);
    }

    [Fact]
    public async Task Category_used_by_a_transaction_cannot_be_deleted_or_change_type()
    {
        var user = await _api.RegisterAsync();
        var account = await user.Client.CreateAccountAsync();
        var category = await user.Client.CreateCategoryAsync("Використана");
        await user.Client.CreateTransactionAsync(account.Id, category.Id);

        var delete = await user.Client.DeleteAsync($"/api/categories/{category.Id}");
        var changeType = await user.Client.PutJsonAsync($"/api/categories/{category.Id}",
            new { name = "Використана", type = "Income", icon = "star", color = "#6FDBD4" });
        var rename = await user.Client.PutJsonAsync($"/api/categories/{category.Id}",
            new { name = "Перейменована", type = "Expense", icon = "star", color = "#6FDBD4" });

        await delete.AssertProblemAsync(HttpStatusCode.Conflict, "conflict");
        await changeType.AssertProblemAsync(HttpStatusCode.Conflict, "conflict");
        Assert.Equal(HttpStatusCode.OK, rename.StatusCode);
    }

    [Theory]
    [InlineData("Нова", "unknown", "#6FDBD4", "icon")]
    [InlineData("Нова", "", "#6FDBD4", "icon")]
    [InlineData("Нова", "star", "#123456", "color")]
    [InlineData("Нова", "star", "", "color")]
    [InlineData("", "star", "#6FDBD4", "name")]
    public async Task Invalid_input_returns_validation_error_for_the_field(
        string name,
        string icon,
        string color,
        string field)
    {
        var user = await _api.RegisterAsync();

        var response = await user.Client.PostJsonAsync("/api/categories",
            new { name, type = "Expense", icon, color });

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", field);
    }

    [Fact]
    public async Task Too_long_name_is_rejected()
    {
        var user = await _api.RegisterAsync();

        var response = await user.Client.PostJsonAsync("/api/categories",
            new { name = new string('а', 41), type = "Expense", icon = "star", color = "#6FDBD4" });

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "name");
    }
}
