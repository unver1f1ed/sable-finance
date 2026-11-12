using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Sable.Tests.Infrastructure;

namespace Sable.Tests;

[Collection(ApiCollection.Name)]
public class HealthTests(ApiFactory factory)
{
    [Fact]
    public async Task Health_returns_ok_when_both_databases_are_reachable()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ok", body.GetProperty("status").GetString());
    }
}
