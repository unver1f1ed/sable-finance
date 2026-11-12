using System.Globalization;
using System.Text;
using Sable.Domain.Enums;

namespace Sable.Application.Transactions;

public static class TransactionCsvWriter
{
    public const string Header = "Дата;Тип;Опис;Категорія;Рахунок;Сума;Нотатка";

    private const string LineEnding = "\r\n";
    private static readonly char[] FormulaPrefixes = ['=', '+', '-', '@'];

    public static byte[] Write(IEnumerable<TransactionDto> rows)
    {
        var builder = new StringBuilder(Header).Append(LineEnding);

        foreach (var row in rows)
        {
            builder
                .Append(row.OccurredOn.ToString("dd.MM.yyyy", CultureInfo.InvariantCulture)).Append(';')
                .Append(row.Type == TransactionType.Income ? "Дохід" : "Витрата").Append(';')
                .Append(Escape(row.Description)).Append(';')
                .Append(Escape(row.Category.Name)).Append(';')
                .Append(Escape(row.Account.Name)).Append(';')
                .Append(FormatAmount(row.Amount)).Append(';')
                .Append(Escape(row.Note ?? string.Empty))
                .Append(LineEnding);
        }

        var encoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true);
        return [.. encoding.GetPreamble(), .. encoding.GetBytes(builder.ToString())];
    }

    private static string FormatAmount(decimal amount) =>
        amount.ToString("0.00", CultureInfo.InvariantCulture).Replace('.', ',');

    private static string Escape(string value)
    {
        if (value.Length > 0 && FormulaPrefixes.Contains(value[0]))
        {
            value = "'" + value;
        }

        return value.IndexOfAny([';', '"', '\r', '\n']) >= 0
            ? "\"" + value.Replace("\"", "\"\"") + "\""
            : value;
    }
}
