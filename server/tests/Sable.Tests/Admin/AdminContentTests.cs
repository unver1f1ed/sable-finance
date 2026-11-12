using System.Net;
using Sable.Application.Admin.Faq;
using Sable.Application.Admin.Plans;
using Sable.Application.Admin.Reviews;
using Sable.Application.Common;
using Sable.Domain.Enums;
using Sable.Tests.Auth;
using Sable.Tests.Finance;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Admin;

[Collection(ApiCollection.Name)]
public class AdminContentTests(ApiFactory factory)
{
    private readonly ApiClient _api = new(factory);

    private static string Tag() => Guid.NewGuid().ToString("N")[..10];

    [Fact]
    public async Task Plan_update_is_visible_in_the_public_list_and_counts_users()
    {
        var admin = await _api.LoginAsAdminAsync();
        var start = (await admin.Client.GetAdminPlansAsync()).Single(p => p.Code == "start");
        var description = $"Опис {Tag()}";

        try
        {
            var update = await admin.Client.UpdatePlanAsync(start, description: description);

            Assert.Equal(HttpStatusCode.OK, update.StatusCode);
            var updated = await update.ReadAsync<AdminPlanDto>();
            Assert.Equal(description, updated.Description);
            Assert.Equal("start", updated.Code);
            Assert.Equal(start.SortOrder, updated.SortOrder);
            Assert.Equal(description, (await _api.Anonymous().GetPublicPlansAsync()).Plans.Single(p => p.Code == "start").Description);
            Assert.True(updated.UserCount >= 0);
        }
        finally
        {
            await admin.Client.UpdatePlanAsync(start);
        }
    }

    [Fact]
    public async Task Admin_plan_list_is_ordered_and_counts_users_per_plan()
    {
        var admin = await _api.LoginAsAdminAsync();
        var before = (await admin.Client.GetAdminPlansAsync()).Single(p => p.Code == "plus").UserCount;
        await _api.RegisterAsync(planCode: "plus");

        var plans = await admin.Client.GetAdminPlansAsync();

        Assert.Equal(["start", "plus"], plans.Take(2).Select(p => p.Code));
        Assert.Equal(before + 1, plans.Single(p => p.Code == "plus").UserCount);
    }

    [Fact]
    public async Task Start_plan_cannot_be_unpublished_and_yearly_price_cannot_exceed_monthly()
    {
        var admin = await _api.LoginAsAdminAsync();
        var plans = await admin.Client.GetAdminPlansAsync();
        var start = plans.Single(p => p.Code == "start");
        var plus = plans.Single(p => p.Code == "plus");

        var unpublish = await admin.Client.UpdatePlanAsync(start, isPublished: false);
        var expensive = await admin.Client.UpdatePlanAsync(plus, priceYearly: plus.PriceMonthly + 1);
        var negative = await admin.Client.UpdatePlanAsync(plus, priceMonthly: -1, priceYearly: -1);

        await unpublish.AssertProblemAsync(HttpStatusCode.Conflict, "conflict");
        await expensive.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "priceYearlyPerMonth");
        await negative.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "priceMonthly");
        Assert.True((await admin.Client.GetAdminPlansAsync()).Single(p => p.Code == "start").IsPublished);
    }

    [Fact]
    public async Task Unknown_plan_id_returns_not_found()
    {
        var admin = await _api.LoginAsAdminAsync();
        var start = (await admin.Client.GetAdminPlansAsync()).Single(p => p.Code == "start");

        var response = await admin.Client.PutJsonAsync($"/api/admin/plans/{Guid.NewGuid()}", new
        {
            name = start.Name,
            description = start.Description,
            priceMonthly = 0,
            priceYearlyPerMonth = 0,
            isPopular = false,
            isPublished = true
        });

        await response.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
    }

    [Fact]
    public async Task Feature_lifecycle_create_validate_reorder_and_delete()
    {
        var admin = await _api.LoginAsAdminAsync();
        var original = (await GetFeaturesAsync(admin.Client)).Select(f => f.Id).ToList();
        var name = $"Тест {Tag()}";
        Guid? createdId = null;

        try
        {
            var create = await admin.Client.PostJsonAsync("/api/admin/plan-features", new
            {
                name,
                values = new Dictionary<string, object>
                {
                    ["start"] = new { kind = "NotIncluded", text = (string?)null },
                    ["plus"] = new { kind = "Text", text = "Так" }
                }
            });
            Assert.Equal(HttpStatusCode.Created, create.StatusCode);
            var created = await create.ReadAsync<AdminFeatureDto>();
            createdId = created.Id;
            Assert.Equal(FeatureKind.Text, created.Values["plus"].Kind);
            Assert.Equal("Так", created.Values["plus"].Text);

            var features = await GetFeaturesAsync(admin.Client);
            Assert.Equal(created.Id, features[^1].Id);
            Assert.Equal(features.Count, features[^1].SortOrder);
            var publicPlans = await _api.Anonymous().GetPublicPlansAsync();
            Assert.Equal(name, publicPlans.Features[^1].Name);

            var noText = await admin.Client.PostJsonAsync("/api/admin/plan-features", new
            {
                name = "Без тексту",
                values = new { plus = new { kind = "Text", text = "  " } }
            });
            var unknownPlan = await admin.Client.PostJsonAsync("/api/admin/plan-features", new
            {
                name = "Невідомий тариф",
                values = new { gold = new { kind = "Included", text = (string?)null } }
            });
            var tooLong = await admin.Client.PostJsonAsync("/api/admin/plan-features", new
            {
                name = "Довгий текст",
                values = new { plus = new { kind = "Text", text = new string('а', 41) } }
            });
            var emptyName = await admin.Client.PostJsonAsync("/api/admin/plan-features", new { name = "", values = new { } });
            await noText.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "values");
            await unknownPlan.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "values");
            await tooLong.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "values");
            await emptyName.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "name");

            var ids = features.Select(f => f.Id).ToList();
            var reversed = Enumerable.Reverse(ids).ToList();
            var reorder = await admin.Client.PutJsonAsync("/api/admin/plan-features/order", new { ids = reversed });
            Assert.Equal(HttpStatusCode.NoContent, reorder.StatusCode);
            Assert.Equal(reversed, (await _api.Anonymous().GetPublicPlansAsync()).Features.Select(f => f.Id));

            var missing = await admin.Client.PutJsonAsync("/api/admin/plan-features/order", new { ids = ids.Skip(1) });
            var duplicated = await admin.Client.PutJsonAsync("/api/admin/plan-features/order",
                new { ids = ids.Skip(1).Append(ids[1]) });
            var unknown = await admin.Client.PutJsonAsync("/api/admin/plan-features/order",
                new { ids = ids.Skip(1).Append(Guid.NewGuid()) });
            await missing.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "ids");
            await duplicated.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "ids");
            await unknown.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "ids");
            Assert.Equal(reversed, (await GetFeaturesAsync(admin.Client)).Select(f => f.Id));

            var update = await admin.Client.PutJsonAsync($"/api/admin/plan-features/{created.Id}", new
            {
                name = name + " 2",
                values = new { start = new { kind = "Included", text = "ignored" } }
            });
            Assert.Equal(HttpStatusCode.OK, update.StatusCode);
            var updated = await update.ReadAsync<AdminFeatureDto>();
            Assert.Equal(name + " 2", updated.Name);
            Assert.Equal(new Sable.Application.Content.FeatureValueDto(FeatureKind.Included, null), updated.Values["start"]);
            Assert.Equal(FeatureKind.NotIncluded, updated.Values["plus"].Kind);
        }
        finally
        {
            if (createdId is { } id)
            {
                var delete = await admin.Client.DeleteAsync($"/api/admin/plan-features/{id}");
                Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
                Assert.Equal(HttpStatusCode.NoContent,
                    (await admin.Client.PutJsonAsync("/api/admin/plan-features/order", new { ids = original })).StatusCode);
            }
        }

        Assert.Equal(original, (await GetFeaturesAsync(admin.Client)).Select(f => f.Id));
        Assert.DoesNotContain((await _api.Anonymous().GetPublicPlansAsync()).Features, f => f.Name.StartsWith(name));
    }

    [Fact]
    public async Task Unknown_feature_id_returns_not_found()
    {
        var admin = await _api.LoginAsAdminAsync();

        var update = await admin.Client.PutJsonAsync($"/api/admin/plan-features/{Guid.NewGuid()}",
            new { name = "Нова", values = new { } });
        var delete = await admin.Client.DeleteAsync($"/api/admin/plan-features/{Guid.NewGuid()}");

        await update.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
        await delete.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
    }

    [Fact]
    public async Task Review_is_hidden_until_published_and_the_filters_work()
    {
        var admin = await _api.LoginAsAdminAsync();
        var tag = Tag();
        var review = await admin.Client.CreateReviewAsync($"Автор {tag}", isPublished: false, rating: 1);

        try
        {
            Assert.DoesNotContain((await _api.Anonymous().GetPublicReviewsAsync()).Items, r => r.Id == review.Id);

            var hidden = await GetReviewsAsync(admin.Client, $"?status=hidden&search={tag}");
            var published = await GetReviewsAsync(admin.Client, $"?status=published&search={tag}");
            var byRating = await GetReviewsAsync(admin.Client, $"?rating=1&search={tag.ToUpperInvariant()}");
            var otherRating = await GetReviewsAsync(admin.Client, $"?rating=4&search={tag}");
            Assert.Equal(review.Id, Assert.Single(hidden.Items).Id);
            Assert.Empty(published.Items);
            Assert.Single(byRating.Items);
            Assert.Empty(otherRating.Items);

            var publish = await admin.Client.PutJsonAsync($"/api/admin/reviews/{review.Id}", new
            {
                author = review.Author,
                text = review.Text,
                rating = 1,
                isPublished = true
            });
            Assert.Equal(HttpStatusCode.OK, publish.StatusCode);
            var reviews = await _api.Anonymous().GetPublicReviewsAsync();
            Assert.Contains(reviews.Items, r => r.Id == review.Id);
            var expected = Math.Round((decimal)reviews.Items.Average(r => r.Rating), 1, MidpointRounding.AwayFromZero);
            Assert.Equal(expected, reviews.Average);
        }
        finally
        {
            await admin.Client.DeleteAsync($"/api/admin/reviews/{review.Id}");
        }

        Assert.DoesNotContain((await _api.Anonymous().GetPublicReviewsAsync()).Items, r => r.Id == review.Id);
    }

    [Theory]
    [InlineData("Автор", "коротко", 5, "text")]
    [InlineData("", "Достатньо довгий текст відгуку", 5, "author")]
    [InlineData("Автор", "Достатньо довгий текст відгуку", 6, "rating")]
    [InlineData("Автор", "Достатньо довгий текст відгуку", 0, "rating")]
    public async Task Invalid_review_is_rejected(string author, string text, int rating, string field)
    {
        var admin = await _api.LoginAsAdminAsync();

        var response = await admin.Client.PostJsonAsync("/api/admin/reviews",
            new { author, text, rating, isPublished = true });

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", field);
    }

    [Theory]
    [InlineData("status=gone", "status")]
    [InlineData("rating=9", "rating")]
    [InlineData("page=0", "page")]
    public async Task Invalid_review_filters_are_rejected(string query, string field)
    {
        var admin = await _api.LoginAsAdminAsync();

        var response = await admin.Client.GetAsync("/api/admin/reviews?" + query);

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", field);
    }

    [Fact]
    public async Task Review_can_be_deleted_once()
    {
        var admin = await _api.LoginAsAdminAsync();
        var review = await admin.Client.CreateReviewAsync($"Видалення {Tag()}", isPublished: false);

        var first = await admin.Client.DeleteAsync($"/api/admin/reviews/{review.Id}");
        var second = await admin.Client.DeleteAsync($"/api/admin/reviews/{review.Id}");

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        await second.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
    }

    [Fact]
    public async Task Faq_topics_are_unique_and_only_empty_topics_can_be_deleted()
    {
        var admin = await _api.LoginAsAdminAsync();
        var name = $"Тема {Tag()}";
        var topic = await admin.Client.CreateFaqTopicAsync(name);
        AdminFaqItemDto? item = null;

        try
        {
            var duplicate = await admin.Client.PostJsonAsync("/api/admin/faq/topics", new { name = name.ToUpperInvariant() });
            await duplicate.AssertProblemAsync(HttpStatusCode.Conflict, "conflict");

            var topics = await GetTopicsAsync(admin.Client);
            Assert.Equal(topic.Id, topics[^1].Id);
            Assert.Equal(0, topics[^1].ItemCount);

            item = await admin.Client.CreateFaqItemAsync(topic.Id, $"Питання {Tag()}");
            Assert.Equal(1, (await GetTopicsAsync(admin.Client)).Single(t => t.Id == topic.Id).ItemCount);
            var blocked = await admin.Client.DeleteAsync($"/api/admin/faq/topics/{topic.Id}");
            await blocked.AssertProblemAsync(HttpStatusCode.Conflict, "conflict");

            Assert.Equal(HttpStatusCode.NoContent, (await admin.Client.DeleteAsync($"/api/admin/faq/items/{item.Id}")).StatusCode);
            item = null;
            Assert.Equal(HttpStatusCode.NoContent, (await admin.Client.DeleteAsync($"/api/admin/faq/topics/{topic.Id}")).StatusCode);
            await (await admin.Client.DeleteAsync($"/api/admin/faq/topics/{topic.Id}"))
                .AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
        }
        finally
        {
            if (item is not null)
            {
                await admin.Client.DeleteAsync($"/api/admin/faq/items/{item.Id}");
            }

            await admin.Client.DeleteAsync($"/api/admin/faq/topics/{topic.Id}");
        }
    }

    [Fact]
    public async Task Faq_item_can_be_created_updated_moved_filtered_and_deleted()
    {
        var admin = await _api.LoginAsAdminAsync();
        var tag = Tag();
        var first = await admin.Client.CreateFaqTopicAsync($"Перша {tag}");
        var second = await admin.Client.CreateFaqTopicAsync($"Друга {tag}");
        var one = await admin.Client.CreateFaqItemAsync(first.Id, $"Перше питання {tag}");
        var two = await admin.Client.CreateFaqItemAsync(first.Id, $"Друге питання {tag}");

        try
        {
            Assert.Equal([1, 2], [one.SortOrder, two.SortOrder]);
            Assert.Equal(first.Name, one.TopicName);

            var move = await admin.Client.PutJsonAsync($"/api/admin/faq/items/{one.Id}", new
            {
                topicId = second.Id,
                question = $"Перенесене питання {tag}",
                answer = "Оновлена відповідь на питання",
                isPublished = false
            });
            Assert.Equal(HttpStatusCode.OK, move.StatusCode);
            var moved = await move.ReadAsync<AdminFaqItemDto>();
            Assert.Equal(second.Id, moved.TopicId);
            Assert.Equal(1, moved.SortOrder);
            Assert.False(moved.IsPublished);
            Assert.True(moved.UpdatedAt >= one.UpdatedAt);

            var inFirst = await GetFaqItemsAsync(admin.Client, $"?topicId={first.Id}");
            var inSecond = await GetFaqItemsAsync(admin.Client, $"?topicId={second.Id}");
            var found = await GetFaqItemsAsync(admin.Client, $"?search={tag.ToUpperInvariant()}");
            Assert.Equal(two.Id, Assert.Single(inFirst).Id);
            Assert.Equal(moved.Id, Assert.Single(inSecond).Id);
            Assert.Equal([two.Id, moved.Id], found.Select(i => i.Id));
        }
        finally
        {
            foreach (var id in new[] { one.Id, two.Id })
            {
                await admin.Client.DeleteAsync($"/api/admin/faq/items/{id}");
            }

            await admin.Client.DeleteAsync($"/api/admin/faq/topics/{first.Id}");
            await admin.Client.DeleteAsync($"/api/admin/faq/topics/{second.Id}");
        }
    }

    [Fact]
    public async Task Invalid_faq_input_is_rejected()
    {
        var admin = await _api.LoginAsAdminAsync();
        var topic = await admin.Client.CreateFaqTopicAsync($"Тема {Tag()}");

        try
        {
            var shortQuestion = await admin.Client.PostJsonAsync("/api/admin/faq/items",
                new { topicId = topic.Id, question = "Ні?", answer = "Достатньо довга відповідь", isPublished = true });
            var shortAnswer = await admin.Client.PostJsonAsync("/api/admin/faq/items",
                new { topicId = topic.Id, question = "Нормальне питання", answer = "Коротко", isPublished = true });
            var unknownTopic = await admin.Client.PostJsonAsync("/api/admin/faq/items",
                new { topicId = Guid.NewGuid(), question = "Нормальне питання", answer = "Достатньо довга відповідь", isPublished = true });
            var emptyTopic = await admin.Client.PostJsonAsync("/api/admin/faq/topics", new { name = "  " });
            var unknownItem = await admin.Client.PutJsonAsync($"/api/admin/faq/items/{Guid.NewGuid()}",
                new { topicId = topic.Id, question = "Нормальне питання", answer = "Достатньо довга відповідь", isPublished = true });

            await shortQuestion.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "question");
            await shortAnswer.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "answer");
            await unknownTopic.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "topicId");
            await emptyTopic.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "name");
            await unknownItem.AssertProblemAsync(HttpStatusCode.NotFound, "not_found");
            Assert.Empty(await GetFaqItemsAsync(admin.Client, $"?topicId={topic.Id}"));
        }
        finally
        {
            await admin.Client.DeleteAsync($"/api/admin/faq/topics/{topic.Id}");
        }
    }

    private static async Task<List<AdminFeatureDto>> GetFeaturesAsync(HttpClient admin)
    {
        var response = await admin.GetAsync("/api/admin/plan-features");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadAsync<List<AdminFeatureDto>>();
    }

    private static async Task<Paged<AdminReviewDto>> GetReviewsAsync(HttpClient admin, string query)
    {
        var response = await admin.GetAsync("/api/admin/reviews" + query);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadAsync<Paged<AdminReviewDto>>();
    }

    private static async Task<List<AdminFaqTopicDto>> GetTopicsAsync(HttpClient admin)
    {
        var response = await admin.GetAsync("/api/admin/faq/topics");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadAsync<List<AdminFaqTopicDto>>();
    }

    private static async Task<List<AdminFaqItemDto>> GetFaqItemsAsync(HttpClient admin, string query)
    {
        var response = await admin.GetAsync("/api/admin/faq/items" + query);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadAsync<List<AdminFaqItemDto>>();
    }
}
