using System.Net;
using Sable.Application.Admin.Faq;
using Sable.Application.Admin.Plans;
using Sable.Application.Admin.Reviews;
using Sable.Application.Admin.Users;
using Sable.Application.Common;
using Sable.Application.Content;
using Sable.Tests.Finance;

namespace Sable.Tests.Admin;

public static class AdminClientExtensions
{
    public static async Task<IReadOnlyList<AdminPlanDto>> GetAdminPlansAsync(this HttpClient admin)
    {
        var response = await admin.GetAsync("/api/admin/plans");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadAsync<List<AdminPlanDto>>();
    }

    public static Task<HttpResponseMessage> UpdatePlanAsync(
        this HttpClient admin,
        AdminPlanDto plan,
        bool? isPublished = null,
        string? description = null,
        decimal? priceMonthly = null,
        decimal? priceYearly = null) =>
        admin.PutJsonAsync($"/api/admin/plans/{plan.Id}", new
        {
            name = plan.Name,
            description = description ?? plan.Description,
            priceMonthly = priceMonthly ?? plan.PriceMonthly,
            priceYearlyPerMonth = priceYearly ?? plan.PriceYearlyPerMonth,
            isPopular = plan.IsPopular,
            isPublished = isPublished ?? plan.IsPublished
        });

    public static async Task<PlanComparisonDto> GetPublicPlansAsync(this HttpClient client)
    {
        var response = await client.GetAsync("/api/plans");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadAsync<PlanComparisonDto>();
    }

    public static async Task<ReviewsDto> GetPublicReviewsAsync(this HttpClient client)
    {
        var response = await client.GetAsync("/api/reviews");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadAsync<ReviewsDto>();
    }

    public static async Task<IReadOnlyList<FaqTopicDto>> GetPublicFaqAsync(this HttpClient client, string? search = null)
    {
        var url = search is null ? "/api/faq" : $"/api/faq?search={Uri.EscapeDataString(search)}";
        var response = await client.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadAsync<List<FaqTopicDto>>();
    }

    public static async Task<Paged<AdminUserDto>> GetAdminUsersAsync(this HttpClient admin, string query = "")
    {
        var response = await admin.GetAsync("/api/admin/users" + query);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadAsync<Paged<AdminUserDto>>();
    }

    public static async Task<AdminUserStats> GetAdminStatsAsync(this HttpClient admin)
    {
        var response = await admin.GetAsync("/api/admin/users/stats");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadAsync<AdminUserStats>();
    }

    public static Task<HttpResponseMessage> UpdateUserAsync(
        this HttpClient admin,
        AdminUserDto user,
        string? role = null,
        string? planCode = null,
        bool? isBlocked = null,
        string? firstName = null) =>
        admin.PutJsonAsync($"/api/admin/users/{user.Id}", new
        {
            firstName = firstName ?? user.FirstName,
            lastName = user.LastName,
            role = role ?? user.Role,
            planCode = planCode ?? user.PlanCode,
            isBlocked = isBlocked ?? user.IsBlocked
        });

    public static async Task<AdminUserDto> FindAdminUserAsync(this HttpClient admin, string email)
    {
        var page = await admin.GetAdminUsersAsync($"?search={Uri.EscapeDataString(email)}");
        return Assert.Single(page.Items, u => u.Email == email);
    }

    public static async Task<AdminReviewDto> CreateReviewAsync(
        this HttpClient admin,
        string author,
        bool isPublished,
        int rating = 5,
        string text = "Це тестовий відгук про сервіс")
    {
        var response = await admin.PostJsonAsync("/api/admin/reviews", new { author, text, rating, isPublished });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await response.ReadAsync<AdminReviewDto>();
    }

    public static async Task<AdminFaqTopicDto> CreateFaqTopicAsync(this HttpClient admin, string name)
    {
        var response = await admin.PostJsonAsync("/api/admin/faq/topics", new { name });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await response.ReadAsync<AdminFaqTopicDto>();
    }

    public static async Task<AdminFaqItemDto> CreateFaqItemAsync(
        this HttpClient admin,
        Guid topicId,
        string question,
        string answer = "Це тестова відповідь на питання",
        bool isPublished = true)
    {
        var response = await admin.PostJsonAsync("/api/admin/faq/items",
            new { topicId, question, answer, isPublished });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await response.ReadAsync<AdminFaqItemDto>();
    }
}
