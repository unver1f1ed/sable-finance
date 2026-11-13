using System.Text.Json;
using System.Text.Json.Serialization;
using Sable.Application.Common;

namespace Sable.Api.Infrastructure;

/// <summary>PostgreSQL cannot store the NUL character in text, so it is rejected before it reaches the database.</summary>
public static class NulCharacterGuard
{
    public static Task RejectInQueryAsync(HttpContext context, RequestDelegate next)
    {
        foreach (var (key, values) in context.Request.Query)
        {
            if (key.Contains('\0') || values.Any(value => value is not null && value.Contains('\0')))
            {
                return ProblemDetailsWriter.WriteAsync(
                    context,
                    StatusCodes.Status400BadRequest,
                    "validation_failed",
                    ErrorDetails.ValidationFailed,
                    new Dictionary<string, string[]> { [string.IsNullOrEmpty(key) ? "query" : key] = [ValidationMessages.InvalidValue] });
            }
        }

        return next(context);
    }
}

/// <summary>Reads strings like the default converter but fails on NUL, which model binding reports as a 400.</summary>
public sealed class NulSafeStringConverter : JsonConverter<string>
{
    public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetString();
        if (value is not null && value.Contains('\0'))
        {
            throw new JsonException("The text contains a character that is not allowed.");
        }

        return value;
    }

    public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value);
}
