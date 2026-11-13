namespace Sable.Tests.Infrastructure;

public class RateLimitedApiFactory : ApiFactory
{
    public const int Limit = 3;

    protected override int AuthRateLimit => Limit;
}
