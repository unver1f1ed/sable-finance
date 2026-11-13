using System.Net;
using Sable.Tests.Infrastructure;

namespace Sable.Tests.Hardening;

[Collection(ProductionLikeCollection.Name)]
public class ProxyAndHeadersTests(ProductionLikeApiFactory factory)
{
    private const string AllowedOrigin = "http://localhost:4200";

    [Fact]
    public async Task Plain_http_request_is_redirected_to_https()
    {
        var response = await factory.CreateDirectClient().GetAsync("/api/plans");

        Assert.True(response.StatusCode is HttpStatusCode.TemporaryRedirect or HttpStatusCode.PermanentRedirect);
        Assert.Equal("https", response.Headers.Location?.Scheme);
    }

    [Fact]
    public async Task Health_probe_over_plain_http_is_not_redirected()
    {
        var response = await factory.CreateDirectClient().GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Request_forwarded_as_https_is_not_redirected_and_gets_hsts()
    {
        var response = await factory.CreateProxiedClient().GetAsync("/api/plans");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var hsts = Assert.Single(response.Headers.GetValues("Strict-Transport-Security"));
        Assert.Contains("max-age=", hsts);
    }

    [Theory]
    [InlineData("/api/plans")]
    [InlineData("/api/does-not-exist")]
    [InlineData("/health")]
    public async Task Every_response_carries_the_security_headers_and_no_server_header(string url)
    {
        var response = await factory.CreateProxiedClient().GetAsync(url);

        Assert.Equal("nosniff", Assert.Single(response.Headers.GetValues("X-Content-Type-Options")));
        Assert.Equal("DENY", Assert.Single(response.Headers.GetValues("X-Frame-Options")));
        Assert.Equal("no-referrer", Assert.Single(response.Headers.GetValues("Referrer-Policy")));
        Assert.False(response.Headers.Contains("Server"));
    }

    [Theory]
    [InlineData("PUT")]
    [InlineData("DELETE")]
    public async Task Preflight_from_the_allowed_origin_is_accepted(string method)
    {
        var request = Preflight(method, AllowedOrigin);

        var response = await factory.CreateProxiedClient().SendAsync(request);

        Assert.True(response.IsSuccessStatusCode, $"preflight returned {(int)response.StatusCode}");
        Assert.Equal(AllowedOrigin, Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
        Assert.Contains(method, string.Join(",", response.Headers.GetValues("Access-Control-Allow-Methods")));
        var allowedHeaders = string.Join(",", response.Headers.GetValues("Access-Control-Allow-Headers")).ToLowerInvariant();
        Assert.Contains("authorization", allowedHeaders);
        Assert.Contains("content-type", allowedHeaders);
        Assert.False(response.Headers.Contains("Access-Control-Allow-Credentials"));
    }

    [Theory]
    [InlineData("https://evil.example")]
    [InlineData("http://localhost:4201")]
    public async Task Preflight_from_a_foreign_origin_gets_no_cors_headers(string origin)
    {
        var response = await factory.CreateProxiedClient().SendAsync(Preflight("PUT", origin));

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task Actual_response_exposes_the_download_and_retry_headers_to_the_allowed_origin()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/plans");
        request.Headers.Add("Origin", AllowedOrigin);

        var response = await factory.CreateProxiedClient().SendAsync(request);

        Assert.Equal(AllowedOrigin, Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
        var exposed = string.Join(",", response.Headers.GetValues("Access-Control-Expose-Headers"));
        Assert.Contains("Content-Disposition", exposed);
        Assert.Contains("Retry-After", exposed);
    }

    [Fact]
    public async Task Foreign_origin_gets_no_allow_origin_header_on_a_normal_request()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/plans");
        request.Headers.Add("Origin", "https://evil.example");

        var response = await factory.CreateProxiedClient().SendAsync(request);

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    private static HttpRequestMessage Preflight(string method, string origin)
    {
        var request = new HttpRequestMessage(HttpMethod.Options, $"/api/accounts/{Guid.NewGuid()}");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", method);
        request.Headers.Add("Access-Control-Request-Headers", "authorization,content-type");
        return request;
    }
}
