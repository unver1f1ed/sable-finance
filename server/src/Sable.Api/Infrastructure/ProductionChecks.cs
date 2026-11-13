using Sable.Infrastructure.Identity;

namespace Sable.Api.Infrastructure;

public static class ProductionChecks
{
    /// <summary>Returns a description of every required setting that is missing or invalid.</summary>
    public static IReadOnlyList<string> FindProblems(IConfiguration configuration)
    {
        var problems = new List<string>();

        foreach (var name in new[] { "Identity", "Finance" })
        {
            if (string.IsNullOrWhiteSpace(configuration.GetConnectionString(name)))
            {
                problems.Add($"ConnectionStrings:{name} is not set");
            }
        }

        if ((configuration["Jwt:Key"] ?? string.Empty).Length < JwtOptions.MinKeyLength)
        {
            problems.Add($"Jwt:Key is not set or shorter than {JwtOptions.MinKeyLength} characters");
        }

        foreach (var name in new[] { "Issuer", "Audience" })
        {
            if (string.IsNullOrWhiteSpace(configuration[$"Jwt:{name}"]))
            {
                problems.Add($"Jwt:{name} is not set");
            }
        }

        var origins = configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
        if (!origins.Any(origin => !string.IsNullOrWhiteSpace(origin)))
        {
            problems.Add("Cors:Origins needs at least one entry (Cors__Origins__0)");
        }

        return problems;
    }

    public static void EnsureValid(IConfiguration configuration)
    {
        var problems = FindProblems(configuration);
        if (problems.Count > 0)
        {
            throw new InvalidOperationException(
                "The application is not configured for Production: " + string.Join("; ", problems) + ".");
        }
    }
}
