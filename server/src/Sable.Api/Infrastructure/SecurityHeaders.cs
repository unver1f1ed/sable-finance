namespace Sable.Api.Infrastructure;

public static class SecurityHeaders
{
    public static Task AddAsync(HttpContext context, RequestDelegate next)
    {
        var headers = context.Response.Headers;
        headers.XContentTypeOptions = "nosniff";
        headers.XFrameOptions = "DENY";
        headers["Referrer-Policy"] = "no-referrer";

        return next(context);
    }
}
