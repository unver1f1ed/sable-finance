namespace Sable.Application.Common;

public static class Errors
{
    public static AppException Validation(string field, string message) =>
        Validation(new Dictionary<string, string[]> { [field] = [message] });

    public static AppException Validation(IDictionary<string, string[]> errors) =>
        new(400, "validation_failed", ErrorDetails.ValidationFailed, errors);

    public static AppException Unauthorized(string detail = ErrorDetails.Unauthorized) =>
        new(401, "unauthorized", detail);

    public static AppException InvalidCredentials(string detail = ErrorDetails.InvalidCredentials) =>
        new(401, "invalid_credentials", detail);

    public static AppException InvalidRefreshToken(string detail = ErrorDetails.InvalidRefreshToken) =>
        new(401, "invalid_refresh_token", detail);

    public static AppException Forbidden(string detail = ErrorDetails.Forbidden) =>
        new(403, "forbidden", detail);

    public static AppException AccountBlocked(string detail = ErrorDetails.AccountBlocked) =>
        new(403, "account_blocked", detail);

    public static AppException PlanLimit(string detail) =>
        new(403, "plan_limit", detail);

    public static AppException NotFound(string detail = ErrorDetails.NotFound) =>
        new(404, "not_found", detail);

    public static AppException EmailTaken(string detail = ErrorDetails.EmailTaken) =>
        new(409, "email_taken", detail);

    public static AppException Conflict(string detail) =>
        new(409, "conflict", detail);

    public static AppException Server(string detail = ErrorDetails.ServerError) =>
        new(500, "server_error", detail);
}
