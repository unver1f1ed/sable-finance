using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Sable.Domain.Enums;
using Sable.Infrastructure.Finance;
using Sable.Tests.Admin;
using Sable.Tests.Auth;
using Sable.Tests.Finance;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Content;

[Collection(ApiCollection.Name)]
public class PublicContentTests(ApiFactory factory)
{
    private readonly ApiClient _api = new(factory);

    [Fact]
    public async Task Plans_are_listed_in_order_with_a_value_for_every_feature_and_plan()
    {
        var plans = await _api.Anonymous().GetPublicPlansAsync();

        Assert.Equal(["start", "plus"], plans.Plans.Select(p => p.Code));
        Assert.Equal(129m, plans.Plans[1].PriceMonthly);
        Assert.True(plans.Plans[1].IsPopular);
        Assert.Equal(8, plans.Features.Count);
        Assert.All(plans.Features, f => Assert.Equal(["plus", "start"], f.Values.Keys.Order()));
        Assert.Equal("Облік доходів і витрат", plans.Features[0].Name);
        Assert.Equal(FeatureKind.Text, plans.Features[2].Values["start"].Kind);
        Assert.Equal("До 2", plans.Features[2].Values["start"].Text);
        Assert.Equal(FeatureKind.NotIncluded, plans.Features[6].Values["start"].Kind);
    }

    [Fact]
    public async Task Public_content_responses_may_be_cached_for_a_minute()
    {
        var client = _api.Anonymous();

        foreach (var url in new[] { "/api/plans", "/api/reviews", "/api/faq" })
        {
            var response = await client.GetAsync(url);
            Assert.Contains("max-age=60", response.Headers.CacheControl?.ToString());
        }
    }

    [Fact]
    public async Task Unpublished_plan_disappears_from_the_public_list_and_cannot_be_chosen()
    {
        var admin = await _api.LoginAsAdminAsync();
        var plus = (await admin.Client.GetAdminPlansAsync()).Single(p => p.Code == "plus");

        try
        {
            Assert.Equal(HttpStatusCode.OK, (await admin.Client.UpdatePlanAsync(plus, isPublished: false)).StatusCode);

            var plans = await _api.Anonymous().GetPublicPlansAsync();
            Assert.Equal(["start"], plans.Plans.Select(p => p.Code));
            Assert.All(plans.Features, f => Assert.Equal(["start"], f.Values.Keys));

            var register = await _api.Anonymous().PostJsonAsync("/api/auth/register", new
            {
                firstName = "Тарас",
                lastName = "Шевченко",
                email = ApiClient.UniqueEmail(),
                password = ApiClient.DefaultPassword,
                planCode = "plus"
            });
            await register.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "planCode");

            var user = await _api.RegisterAsync();
            var change = await user.Client.PutJsonAsync("/api/me/plan", new { planCode = "plus" });
            await change.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", "planCode");
        }
        finally
        {
            await admin.Client.UpdatePlanAsync(plus, isPublished: true);
        }

        Assert.Equal(["start", "plus"], (await _api.Anonymous().GetPublicPlansAsync()).Plans.Select(p => p.Code));
    }

    [Fact]
    public async Task Reviews_list_only_published_ones_with_a_matching_average()
    {
        var admin = await _api.LoginAsAdminAsync();
        var tag = Guid.NewGuid().ToString("N")[..8];
        var hidden = await admin.Client.CreateReviewAsync($"Прихований {tag}", isPublished: false, rating: 1);
        var visible = await admin.Client.CreateReviewAsync($"Видимий {tag}", isPublished: true, rating: 2);

        try
        {
            var reviews = await _api.Anonymous().GetPublicReviewsAsync();

            Assert.DoesNotContain(reviews.Items, r => r.Id == hidden.Id);
            Assert.Contains(reviews.Items, r => r.Id == visible.Id);
            Assert.Equal(visible.Id, reviews.Items[0].Id);
            var expected = Math.Round((decimal)reviews.Items.Average(r => r.Rating), 1, MidpointRounding.AwayFromZero);
            Assert.Equal(expected, reviews.Average);
        }
        finally
        {
            await admin.Client.DeleteAsync($"/api/admin/reviews/{hidden.Id}");
            await admin.Client.DeleteAsync($"/api/admin/reviews/{visible.Id}");
        }
    }

    [Fact]
    public async Task Faq_lists_all_topics_in_order()
    {
        var topics = await _api.Anonymous().GetPublicFaqAsync();

        Assert.Equal(
            ["Початок роботи", "Транзакції", "Бюджети й цілі", "Тарифи й оплата", "Безпека"],
            topics.Take(5).Select(t => t.Name));
        Assert.Equal(17, topics.Take(5).Sum(t => t.Items.Count));
    }

    [Fact]
    public async Task Faq_search_is_case_insensitive_and_omits_topics_without_matches()
    {
        var all = await _api.Anonymous().GetPublicFaqAsync();

        var found = await _api.Anonymous().GetPublicFaqAsync("БЮДЖЕТ");
        var blank = await _api.Anonymous().GetPublicFaqAsync("   ");
        var none = await _api.Anonymous().GetPublicFaqAsync("такого-слова-немає");

        Assert.NotEmpty(found);
        Assert.True(found.Count < all.Count);
        Assert.All(found.SelectMany(t => t.Items), i =>
            Assert.True(
                i.Question.Contains("бюджет", StringComparison.OrdinalIgnoreCase)
                || i.Answer.Contains("бюджет", StringComparison.OrdinalIgnoreCase)));
        Assert.Equal(all.Count, blank.Count);
        Assert.Empty(none);
    }

    [Fact]
    public async Task Unpublished_faq_items_are_not_returned()
    {
        var admin = await _api.LoginAsAdminAsync();
        var tag = Guid.NewGuid().ToString("N")[..10];
        var topic = await admin.Client.CreateFaqTopicAsync($"Тема {tag}");
        var item = await admin.Client.CreateFaqItemAsync(topic.Id, $"Приховане питання {tag}", isPublished: false);

        try
        {
            Assert.Empty(await _api.Anonymous().GetPublicFaqAsync(tag));
            Assert.DoesNotContain(await _api.Anonymous().GetPublicFaqAsync(), t => t.Id == topic.Id);
        }
        finally
        {
            await admin.Client.DeleteAsync($"/api/admin/faq/items/{item.Id}");
            await admin.Client.DeleteAsync($"/api/admin/faq/topics/{topic.Id}");
        }
    }

    [Fact]
    public async Task Contact_message_is_stored_and_trimmed()
    {
        var email = ApiClient.UniqueEmail();

        var response = await _api.Anonymous().PostJsonAsync("/api/contact", new
        {
            name = "  Ірина  ",
            email,
            topic = "Питання",
            message = "  Доброго дня, хочу уточнити деталі тарифу  ",
            consent = true
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var id = (await response.ReadJsonAsync()).GetProperty("id").GetGuid();

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FinanceDbContext>();
        var stored = await db.ContactMessages.SingleAsync(m => m.Id == id);
        Assert.Equal("Ірина", stored.Name);
        Assert.Equal(email, stored.Email);
        Assert.Equal("Доброго дня, хочу уточнити деталі тарифу", stored.Message);
    }

    [Theory]
    [InlineData("Ірина", "ok@test.ua", "Питання", "Достатньо довге повідомлення", false, "consent")]
    [InlineData("Ірина", "not-an-email", "Питання", "Достатньо довге повідомлення", true, "email")]
    [InlineData("Ірина", "ok@test.ua", "Питання", "дев'ять 9", true, "message")]
    [InlineData("", "ok@test.ua", "Питання", "Достатньо довге повідомлення", true, "name")]
    [InlineData("Ірина", "ok@test.ua", "", "Достатньо довге повідомлення", true, "topic")]
    public async Task Invalid_contact_message_is_rejected(
        string name,
        string email,
        string topic,
        string message,
        bool consent,
        string field)
    {
        var response = await _api.Anonymous().PostJsonAsync("/api/contact", new { name, email, topic, message, consent });

        await response.AssertProblemAsync(HttpStatusCode.BadRequest, "validation_failed", field);
    }

    [Fact]
    public async Task Contact_consent_message_is_in_ukrainian()
    {
        var response = await _api.Anonymous().PostJsonAsync("/api/contact", new
        {
            name = "Ірина",
            email = "ok@test.ua",
            topic = "Питання",
            message = "Достатньо довге повідомлення",
            consent = false
        });

        var body = await response.ReadJsonAsync();
        Assert.Equal("Потрібна згода на обробку даних", body.GetProperty("errors").GetProperty("consent")[0].GetString());
    }
}
