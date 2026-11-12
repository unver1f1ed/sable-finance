using Npgsql;
using Sable.Tests.Infrastructure;

namespace Sable.Tests;

[Collection(ApiCollection.Name)]
public class DatabaseSchemaTests(ApiFactory factory)
{
    [Fact]
    public async Task Migrations_are_applied_to_each_database_separately()
    {
        // Creating a client starts the host, which runs the migrations.
        using var client = factory.CreateClient();

        Assert.True(await TableExistsAsync(factory.FinanceConnectionString, "transactions"));
        Assert.True(await TableExistsAsync(factory.IdentityConnectionString, "asp_net_users"));
        Assert.True(await TableExistsAsync(factory.IdentityConnectionString, "refresh_tokens"));

        Assert.False(await TableExistsAsync(factory.FinanceConnectionString, "asp_net_users"));
        Assert.False(await TableExistsAsync(factory.IdentityConnectionString, "transactions"));
    }

    private static async Task<bool> TableExistsAsync(string connectionString, string table)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            "select count(*) from information_schema.tables where table_schema = 'public' and table_name = @name",
            connection);
        command.Parameters.AddWithValue("name", table);

        return (long)(await command.ExecuteScalarAsync())! == 1;
    }
}
