using System.Net;
using Microsoft.Extensions.Configuration;
using Sable.Api.Infrastructure;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Hardening;

public class ProductionChecksTests
{
    private static Dictionary<string, string?> Valid() => new()
    {
        ["ConnectionStrings:Identity"] = "Host=db;Database=sable_identity",
        ["ConnectionStrings:Finance"] = "Host=db;Database=sable_finance",
        ["Jwt:Key"] = new string('k', 64),
        ["Jwt:Issuer"] = "sable-api",
        ["Jwt:Audience"] = "sable-client",
        ["Cors:Origins:0"] = "https://client.example"
    };

    private static IConfiguration Build(Dictionary<string, string?> values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values).Build();

    [Fact]
    public void Complete_configuration_has_no_problems()
    {
        Assert.Empty(ProductionChecks.FindProblems(Build(Valid())));
    }

    [Theory]
    [InlineData("ConnectionStrings:Identity", "ConnectionStrings:Identity")]
    [InlineData("ConnectionStrings:Finance", "ConnectionStrings:Finance")]
    [InlineData("Jwt:Key", "Jwt:Key")]
    [InlineData("Jwt:Issuer", "Jwt:Issuer")]
    [InlineData("Jwt:Audience", "Jwt:Audience")]
    [InlineData("Cors:Origins:0", "Cors:Origins")]
    public void Each_missing_setting_is_reported_by_name(string key, string expected)
    {
        var values = Valid();
        values.Remove(key);

        var problems = ProductionChecks.FindProblems(Build(values));

        Assert.Contains(problems, p => p.Contains(expected));
        Assert.Single(problems);
    }

    [Fact]
    public void Short_jwt_key_is_rejected()
    {
        var values = Valid();
        values["Jwt:Key"] = "too-short";

        var exception = Assert.Throws<InvalidOperationException>(() => ProductionChecks.EnsureValid(Build(values)));

        Assert.Contains("Jwt:Key", exception.Message);
        Assert.DoesNotContain("too-short", exception.Message);
    }

    [Fact]
    public void All_problems_are_listed_together()
    {
        var exception = Assert.Throws<InvalidOperationException>(() => ProductionChecks.EnsureValid(Build([])));

        foreach (var name in new[] { "ConnectionStrings:Identity", "ConnectionStrings:Finance", "Jwt:Key", "Jwt:Issuer", "Jwt:Audience", "Cors:Origins" })
        {
            Assert.Contains(name, exception.Message);
        }
    }
}

[Collection(ProductionLikeCollection.Name)]
public class HealthHardeningTests(ProductionLikeApiFactory factory)
{
    [Fact]
    public async Task Health_is_open_not_cached_and_not_rate_limited()
    {
        var client = factory.CreateProxiedClient("198.51.100.77");

        for (var i = 0; i < ProductionLikeApiFactory.AuthLimit * 3; i++)
        {
            var response = await client.GetAsync("/health");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Contains("no-store", response.Headers.CacheControl?.ToString());
        }
    }
}
