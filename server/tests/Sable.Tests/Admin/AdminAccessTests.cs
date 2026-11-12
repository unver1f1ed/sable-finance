using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Sable.Tests.Auth;
using Sable.Tests.Finance;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Admin;

[Collection(ApiCollection.Name)]
public partial class AdminAccessTests(ApiFactory factory)
{
    private readonly ApiClient _api = new(factory);

    public static readonly string[] Routes =
    [
        "GET api/admin/users",
        "GET api/admin/users/stats",
        "PUT api/admin/users/{id}",
        "DELETE api/admin/users/{id}",
        "GET api/admin/plans",
        "PUT api/admin/plans/{id}",
        "GET api/admin/plan-features",
        "POST api/admin/plan-features",
        "PUT api/admin/plan-features/order",
        "PUT api/admin/plan-features/{id}",
        "DELETE api/admin/plan-features/{id}",
        "GET api/admin/reviews",
        "POST api/admin/reviews",
        "PUT api/admin/reviews/{id}",
        "DELETE api/admin/reviews/{id}",
        "GET api/admin/faq/topics",
        "POST api/admin/faq/topics",
        "DELETE api/admin/faq/topics/{id}",
        "GET api/admin/faq/items",
        "POST api/admin/faq/items",
        "PUT api/admin/faq/items/{id}",
        "DELETE api/admin/faq/items/{id}"
    ];

    public static TheoryData<string> RouteData => new(Routes);

    [Fact]
    public void Route_list_covers_every_admin_endpoint()
    {
        using var client = factory.CreateClient();
        var endpoints = factory.Services.GetRequiredService<EndpointDataSource>().Endpoints
            .OfType<RouteEndpoint>()
            .Where(e => e.RoutePattern.RawText!.StartsWith("api/admin", StringComparison.OrdinalIgnoreCase))
            .SelectMany(e => e.Metadata.GetMetadata<HttpMethodMetadata>()!.HttpMethods
                .Select(method => $"{method} {GuidConstraint().Replace(e.RoutePattern.RawText!, "{id}")}"))
            .Order()
            .ToList();

        Assert.Equal(Routes.Order(), endpoints);
    }

    [Theory]
    [MemberData(nameof(RouteData))]
    public async Task Admin_route_rejects_anonymous_callers(string route)
    {
        var response = await SendAsync(_api.Anonymous(), route);

        await response.AssertProblemAsync(HttpStatusCode.Unauthorized, "unauthorized");
    }

    [Theory]
    [MemberData(nameof(RouteData))]
    public async Task Admin_route_rejects_regular_users(string route)
    {
        var user = await _api.RegisterAsync();

        var response = await SendAsync(user.Client, route);

        await response.AssertProblemAsync(HttpStatusCode.Forbidden, "forbidden");
    }

    [Theory]
    [MemberData(nameof(RouteData))]
    public async Task Admin_route_is_open_for_the_admin(string route)
    {
        var admin = await _api.LoginAsAdminAsync();

        var response = await SendAsync(admin.Client, route);

        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.True((int)response.StatusCode < 500, $"{route} returned {(int)response.StatusCode}");
    }

    private static Task<HttpResponseMessage> SendAsync(HttpClient client, string route)
    {
        var parts = route.Split(' ');
        var request = new HttpRequestMessage(new HttpMethod(parts[0]), "/" + parts[1].Replace("{id}", Guid.NewGuid().ToString()));
        if (parts[0] is "POST" or "PUT")
        {
            request.Content = JsonContent.Create(new { });
        }

        return client.SendAsync(request);
    }

    [GeneratedRegex(@"\{id:guid\}")]
    private static partial Regex GuidConstraint();
}
