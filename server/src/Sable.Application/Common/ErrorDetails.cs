namespace Sable.Application.Common;

public static class ErrorDetails
{
    public const string ValidationFailed = "Перевірте правильність введених даних";
    public const string Unauthorized = "Потрібно увійти в обліковий запис";
    public const string InvalidCredentials = "Неправильна пошта або пароль";
    public const string InvalidRefreshToken = "Сеанс завершено. Увійдіть знову";
    public const string Forbidden = "Недостатньо прав для цієї дії";
    public const string AccountBlocked = "Акаунт заблоковано. Зверніться до підтримки";
    public const string NotFound = "Запис не знайдено";
    public const string EmailTaken = "Ця адреса пошти вже використовується";
    public const string ServerError = "Сталася неочікувана помилка. Спробуйте пізніше";
    public const string TooManyRequests = "Забагато спроб. Спробуйте за хвилину";
    public const string ServiceUnavailable = "Сервіс тимчасово недоступний. Спробуйте пізніше";
}
