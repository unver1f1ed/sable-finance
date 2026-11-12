namespace Sable.Application.Common;

public static class Errors
{
    public static AppException Validation(string field, string message) =>
        Validation(new Dictionary<string, string[]> { [field] = [message] });

    public static AppException Validation(IDictionary<string, string[]> errors) =>
        new(400, "validation_failed", "Перевірте правильність введених даних", errors);

    public static AppException Unauthorized(string detail = "Потрібно увійти в обліковий запис") =>
        new(401, "unauthorized", detail);

    public static AppException InvalidCredentials(string detail = "Неправильна адреса пошти або пароль") =>
        new(401, "invalid_credentials", detail);

    public static AppException InvalidRefreshToken(string detail = "Сеанс завершено. Увійдіть знову") =>
        new(401, "invalid_refresh_token", detail);

    public static AppException Forbidden(string detail = "Недостатньо прав для цієї дії") =>
        new(403, "forbidden", detail);

    public static AppException AccountBlocked(string detail = "Обліковий запис заблоковано") =>
        new(403, "account_blocked", detail);

    public static AppException PlanLimit(string detail) =>
        new(403, "plan_limit", detail);

    public static AppException NotFound(string detail = "Запис не знайдено") =>
        new(404, "not_found", detail);

    public static AppException EmailTaken(string detail = "Ця адреса пошти вже використовується") =>
        new(409, "email_taken", detail);

    public static AppException Conflict(string detail) =>
        new(409, "conflict", detail);

    public static AppException Server(string detail = "Сталася неочікувана помилка. Спробуйте пізніше") =>
        new(500, "server_error", detail);
}
