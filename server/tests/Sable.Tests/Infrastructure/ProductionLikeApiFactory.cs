using System.Net.Http.Headers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Sable.Tests.Infrastructure;

/// <summary>A factory that behaves like the deployed API: HTTPS redirection is on and the auth rate limit is low.</summary>
public class ProductionLikeApiFactory : ApiFactory
{
    public const int AuthLimit = 3;

    protected override void ConfigureSettings(IWebHostBuilder builder)
    {
        builder.UseSetting("RateLimit:AuthPerMinute", AuthLimit.ToString());
        builder.UseSetting("HttpsRedirection:Port", "443");
    }

    /// <summary>A client that talks like the Azure front end: TLS is terminated there and the headers say so.</summary>
    public HttpClient CreateProxiedClient(string? clientIp = null)
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Add("X-Forwarded-Proto", "https");
        if (clientIp is not null)
        {
            client.DefaultRequestHeaders.Add("X-Forwarded-For", clientIp);
        }

        return client;
    }

    public HttpClient CreateDirectClient() =>
        CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
}

[CollectionDefinition(Name)]
public class ProductionLikeCollection : ICollectionFixture<ProductionLikeApiFactory>
{
    public const string Name = "production-like";
}
