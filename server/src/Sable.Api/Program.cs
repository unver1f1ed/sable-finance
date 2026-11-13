using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Sable.Api.Infrastructure;
using Sable.Application;
using Sable.Application.Abstractions;
using Sable.Application.Common;
using Sable.Infrastructure;
using Sable.Infrastructure.Identity;

const string CorsPolicy = "Client";

var builder = WebApplication.CreateBuilder(args);

if (builder.Environment.IsProduction())
{
    ProductionChecks.EnsureValid(builder.Configuration);
}

builder.Services
    .AddControllers(options =>
    {
        var messages = options.ModelBindingMessageProvider;
        messages.SetValueIsInvalidAccessor(_ => ValidationMessages.InvalidValue);
        messages.SetAttemptedValueIsInvalidAccessor((_, _) => ValidationMessages.InvalidValue);
        messages.SetUnknownValueIsInvalidAccessor(_ => ValidationMessages.InvalidValue);
        messages.SetValueMustBeANumberAccessor(_ => ValidationMessages.InvalidValue);
        messages.SetNonPropertyAttemptedValueIsInvalidAccessor(_ => ValidationMessages.InvalidValue);
        messages.SetNonPropertyUnknownValueIsInvalidAccessor(() => ValidationMessages.InvalidValue);
        messages.SetNonPropertyValueMustBeANumberAccessor(() => ValidationMessages.InvalidValue);
        messages.SetMissingBindRequiredValueAccessor(_ => ValidationMessages.Required);
        messages.SetMissingKeyOrValueAccessor(() => ValidationMessages.Required);
        messages.SetMissingRequestBodyRequiredValueAccessor(() => ValidationMessages.InvalidValue);
        options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
    })
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()))
    .ConfigureApiBehaviorOptions(options =>
        options.InvalidModelStateResponseFactory = ValidationResponseFactory.Create);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtOptions>>((bearer, jwtOptions) =>
    {
        var jwt = jwtOptions.Value;

        bearer.MapInboundClaims = false;
        bearer.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "sub",
            RoleClaimType = "role"
        };

        bearer.Events = new JwtBearerEvents
        {
            OnChallenge = context =>
            {
                context.HandleResponse();
                return ProblemDetailsWriter.WriteAsync(
                    context.HttpContext, StatusCodes.Status401Unauthorized, "unauthorized", ErrorDetails.Unauthorized);
            },
            OnForbidden = context => ProblemDetailsWriter.WriteAsync(
                context.HttpContext, StatusCodes.Status403Forbidden, "forbidden", ErrorDetails.Forbidden)
        };
    });
builder.Services.AddAuthorization();

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddPolicy(CorsPolicy, policy => policy
    .WithOrigins(corsOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .WithExposedHeaders("Content-Disposition", "Retry-After")));

var behindProxy = !builder.Environment.IsDevelopment();
if (behindProxy)
{
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
    });
    builder.Services.AddHsts(options =>
    {
        options.MaxAge = TimeSpan.FromDays(365);
        options.ExcludedHosts.Clear();
    });
}

var httpsRedirectPort = builder.Configuration.GetValue<int?>("HttpsRedirection:Port");
if (httpsRedirectPort is not null)
{
    builder.Services.AddHttpsRedirection(options => options.HttpsPort = httpsRedirectPort);
}

builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);

builder.Services.AddAuthRateLimiting(builder.Configuration);
builder.Services.AddExceptionHandler<ExceptionHandler>();
builder.Services.AddProblemDetails();

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddOpenApi();
}

var app = builder.Build();

if (behindProxy)
{
    app.UseForwardedHeaders();
    app.UseHsts();
}

app.Use(SecurityHeaders.AddAsync);

using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<DatabaseInitializer>().InitializeAsync();
}

app.UseExceptionHandler();
app.UseStatusCodePages(StatusCodeResponses.WriteAsync);

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (httpsRedirectPort is not null)
{
    // Platform health probes may reach the container over plain HTTP, so /health is never redirected.
    app.UseWhen(
        context => !context.Request.Path.StartsWithSegments("/health"),
        branch => branch.UseHttpsRedirection());
}

app.UseCors(CorsPolicy);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", HealthEndpoint.HandleAsync).AllowAnonymous().DisableRateLimiting();
app.MapControllers();

app.Run();

public partial class Program;
