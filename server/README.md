# Sable — серверна частина

REST API сервісу персонального фінансового планування. ASP.NET Core на .NET 10, EF Core, ASP.NET Core Identity і PostgreSQL 16 з двома окремими базами даних: `sable_identity` (користувачі й токени) та `sable_finance` (фінансові дані та публічний вміст).

## Вимоги

- .NET SDK 10
- Docker (для локальної бази даних і для інтеграційних тестів)

## База даних

Локальний PostgreSQL запускається з каталогу `server/`:

```bash
docker compose up -d
```

Контейнер створює обидві бази (`sable_identity`, `sable_finance`) на порту 5432. Користувач `sable`, пароль `sable_dev` — лише для локальної розробки. Міграції застосовуються автоматично під час запуску API.

## Запуск

```bash
dotnet run --project src/Sable.Api
```

API працює на `http://localhost:5080`. Перевірка стану: `GET /health` повертає `{"status":"ok"}`, коли обидві бази доступні. У середовищі Development опис API доступний за адресою `/openapi/v1.json`.

## Тести

```bash
dotnet test
```

Інтеграційні тести самі піднімають PostgreSQL у контейнері (Testcontainers), тому Docker має бути запущений.

## Міграції

Інструмент `dotnet-ef` підключено як локальний (`dotnet tool restore`). Приклад для фінансової бази:

```bash
dotnet ef migrations add <Name> --context FinanceDbContext --project src/Sable.Infrastructure --startup-project src/Sable.Api --output-dir Finance/Migrations
```

Для бази користувачів використовуйте `--context IdentityDbContext` і `--output-dir Identity/Migrations`.

## Змінні середовища

Вкладені ключі записуються через подвійне підкреслення.

| Змінна | Призначення |
|---|---|
| `ConnectionStrings__Identity` | рядок підключення до бази `sable_identity` |
| `ConnectionStrings__Finance` | рядок підключення до бази `sable_finance` |
| `Jwt__Key` | ключ підпису токенів, щонайменше 64 символи |
| `Jwt__Issuer` | видавець токенів, наприклад `sable-api` |
| `Jwt__Audience` | аудиторія токенів, наприклад `sable-client` |
| `Cors__Origins__0` | дозволене джерело клієнта, наприклад `http://localhost:4200` |
| `Seed__AdminEmail`, `Seed__AdminPassword` | дані першого адміністратора |

Приклад значень наведено у файлі `.env.example`. Для розробки готові налаштування лежать у `src/Sable.Api/appsettings.Development.json`.
