using System.Net;
using Sable.Tests.Finance;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Hardening;

[Collection(ProductionLikeCollection.Name)]
public class RateLimitTests(ProductionLikeApiFactory factory)
{
    private static readonly object Login = new { email = "nobody@test.ua", password = "Passw0rd123" };

    [Fact]
    public async Task Auth_and_contact_endpoints_share_a_limit_per_client_and_answer_429_when_it_is_used_up()
    {
        var client = factory.CreateProxiedClient("198.51.100.20");

        for (var i = 0; i < ProductionLikeApiFactory.AuthLimit; i++)
        {
            var allowed = await client.PostJsonAsync("/api/auth/login", Login);
            Assert.Equal(HttpStatusCode.Unauthorized, allowed.StatusCode);
        }

        var limited = await client.PostJsonAsync("/api/auth/login", Login);

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.Equal("application/problem+json", limited.Content.Headers.ContentType?.MediaType);
        Assert.True(limited.Headers.RetryAfter?.Delta?.TotalSeconds is > 0 and <= 60);
        var body = await limited.ReadJsonAsync();
        Assert.Equal("too_many_requests", body.GetProperty("code").GetString());
        Assert.Equal("Too many requests", body.GetProperty("title").GetString());
        Assert.Equal(429, body.GetProperty("status").GetInt32());
        Assert.Equal("Забагато спроб. Спробуйте за хвилину", body.GetProperty("detail").GetString());

        foreach (var (url, payload) in new (string, object)[]
        {
            ("/api/auth/register", new { }),
            ("/api/auth/refresh", new { refreshToken = "x" }),
            ("/api/contact", new { })
        })
        {
            var response = await client.PostJsonAsync(url, payload);
            Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        }

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostJsonAsync("/api/auth/logout", new { refreshToken = "x" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/plans")).StatusCode);
    }

    [Fact]
    public async Task Each_client_address_behind_the_proxy_has_its_own_limit()
    {
        var first = factory.CreateProxiedClient("198.51.100.31");
        var second = factory.CreateProxiedClient("198.51.100.32");

        for (var i = 0; i < ProductionLikeApiFactory.AuthLimit; i++)
        {
            await first.PostJsonAsync("/api/auth/login", Login);
        }

        var firstClient = await first.PostJsonAsync("/api/auth/login", Login);
        var secondClient = await second.PostJsonAsync("/api/auth/login", Login);

        Assert.Equal(HttpStatusCode.TooManyRequests, firstClient.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, secondClient.StatusCode);
    }
}
