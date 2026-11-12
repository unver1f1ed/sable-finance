using System.ComponentModel.DataAnnotations;

namespace Sable.Application.Auth;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class PasswordAttribute : ValidationAttribute
{
    public const int MinLength = 8;
    public const int MaxLength = 100;
    public const string Message = "Пароль має містити щонайменше 8 символів, літери й цифри";

    public PasswordAttribute() : base(Message)
    {
    }

    public static bool IsValidPassword(string? value) =>
        value is { Length: >= MinLength and <= MaxLength }
        && value.Any(char.IsLetter)
        && value.Any(char.IsDigit);

    public override bool IsValid(object? value) => IsValidPassword(value as string);
}
