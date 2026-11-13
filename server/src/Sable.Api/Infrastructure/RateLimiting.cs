using System.Globalization;
using System.Threading.RateLimiting;
using Sable.Application.Common;

namespace Sable.Api.Infrastructure;

public static class RateLimiting
{
    public const string AuthPolicy = "auth";
    public const string ConfigKey = "RateLimit:AuthPerMinute";
    public const int DefaultAuthPerMinute = 10;

    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    public static IServiceCollection AddAuthRateLimiting(this IServiceCollection services, IConfiguration configuration)
    {
        var permitLimit = configuration.GetValue(ConfigKey, DefaultAuthPerMinute);

        return services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.AddPolicy(AuthPolicy, context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = permitLimit,
                    Window = Window,
                    QueueLimit = 0,
                    AutoReplenishment = true
                }));

            options.OnRejected = (context, _) =>
            {
                var retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var delay)
                    ? Math.Max(1, (int)Math.Ceiling(delay.TotalSeconds))
                    : (int)Window.TotalSeconds;
                context.HttpContext.Response.Headers.RetryAfter = retryAfter.ToString(CultureInfo.InvariantCulture);

                return new ValueTask(ProblemDetailsWriter.WriteAsync(
                    context.HttpContext,
                    StatusCodes.Status429TooManyRequests,
                    "too_many_requests",
                    ErrorDetails.TooManyRequests));
            };
        });
    }
}
