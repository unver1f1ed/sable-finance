using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Testcontainers.PostgreSql;

namespace Sable.Tests.Infrastructure;

public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private const string IdentityDatabase = "sable_identity";
    private const string FinanceDatabase = "sable_finance";

    public const string AdminEmail = "admin@test.ua";
    public const string AdminPassword = "Admin-Test-1234";

    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16")
        .WithDatabase(IdentityDatabase)
        .Build();

    public string IdentityConnectionString => _postgres.GetConnectionString();

    public string FinanceConnectionString =>
        new NpgsqlConnectionStringBuilder(_postgres.GetConnectionString()) { Database = FinanceDatabase }.ConnectionString;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        var result = await _postgres.ExecScriptAsync($"CREATE DATABASE {FinanceDatabase};");
        if (result.ExitCode != 0)
        {
            throw new InvalidOperationException($"Could not create the finance database: {result.Stderr}");
        }
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Identity", IdentityConnectionString);
        builder.UseSetting("ConnectionStrings:Finance", FinanceConnectionString);
        builder.UseSetting("Jwt:Key", "test-only-signing-key-0123456789-abcdefghijklmnopqrstuvwxyz-ABCDEFGHIJ");
        builder.UseSetting("Jwt:Issuer", "sable-api");
        builder.UseSetting("Jwt:Audience", "sable-client");
        builder.UseSetting("Cors:Origins:0", "http://localhost:4200");
        builder.UseSetting("Seed:AdminEmail", AdminEmail);
        builder.UseSetting("Seed:AdminPassword", AdminPassword);

        builder.ConfigureServices(services => services
            .AddControllers()
            .AddApplicationPart(typeof(ApiFactory).Assembly));
    }
}
