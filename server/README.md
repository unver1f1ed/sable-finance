# Sable — серверна частина

REST API сервісу персонального фінансового планування. ASP.NET Core на .NET 10, EF Core, ASP.NET Core Identity і PostgreSQL 16 з двома окремими базами даних: `sable_identity` (користувачі й токени) та `sable_finance` (фінансові дані та публічний вміст).

## Вимоги

- .NET SDK 10
- Docker (для локальної бази даних і для інтеграційних тестів)

## Перший запуск

У репозиторії немає жодних паролів чи ключів. Їх потрібно задати локально один раз.

1. Створіть файл `.env` із шаблону й вкажіть власний пароль бази даних (з каталогу `server/`):

   ```bash
   cp .env.example .env
   ```

   У `.env` змініть значення `POSTGRES_PASSWORD`. Файл `.env` не потрапляє до git.

2. Запустіть базу даних. Контейнер створює обидві бази (`sable_identity`, `sable_finance`) на порту 5432:

   ```bash
   docker compose up -d
   ```

3. Збережіть секрети застосунку в `dotnet user-secrets` (вони лежать поза репозиторієм). Підставте свої значення замість `<...>`; пароль у рядках підключення має збігатися з `POSTGRES_PASSWORD`:

   ```bash
   dotnet user-secrets set "ConnectionStrings:Identity" "Host=localhost;Port=5432;Username=sable;Password=<пароль бази>;Database=sable_identity" --project src/Sable.Api
   dotnet user-secrets set "ConnectionStrings:Finance" "Host=localhost;Port=5432;Username=sable;Password=<пароль бази>;Database=sable_finance" --project src/Sable.Api
   dotnet user-secrets set "Jwt:Key" "<щонайменше 64 випадкових символи>" --project src/Sable.Api
   dotnet user-secrets set "Seed:AdminPassword" "<пароль першого адміністратора>" --project src/Sable.Api
   ```

   Ключ для `Jwt:Key` можна згенерувати так:

   ```bash
   openssl rand -base64 64
   ```

   або в PowerShell:

   ```powershell
   [Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
   ```

4. Запустіть API:

   ```bash
   dotnet run --project src/Sable.Api
   ```

API працює на `http://localhost:5080`. Міграції й початкові дані застосовуються автоматично під час запуску. Перевірка стану: `GET /health` повертає `{"status":"ok"}`, коли обидві бази доступні. У середовищі Development опис API доступний за адресою `/openapi/v1.json`. Якщо рядок підключення або ключ не задано, застосунок зупиняється з повідомленням про відсутнє налаштування.

## Тести

```bash
dotnet test
```

Інтеграційні тести самі піднімають PostgreSQL у контейнері (Testcontainers) і використовують власні тестові значення, тому Docker має бути запущений, а user-secrets не потрібні.

## Міграції

Інструмент `dotnet-ef` підключено як локальний (`dotnet tool restore`). Приклад для фінансової бази (середовище Development потрібне, щоб підхопити секрети):

```bash
dotnet ef migrations add <Name> --context FinanceDbContext --project src/Sable.Infrastructure --startup-project src/Sable.Api --output-dir Finance/Migrations
```

Для бази користувачів використовуйте `--context IdentityDbContext` і `--output-dir Identity/Migrations`.

## Змінні середовища

Вкладені ключі записуються через подвійне підкреслення. У розробці їх замінюють user-secrets і `appsettings.Development.json`, у продакшні вони задаються змінними середовища.

| Змінна | Призначення |
|---|---|
| `POSTGRES_PASSWORD` | пароль користувача PostgreSQL у `docker compose` (файл `.env`) |
| `ConnectionStrings__Identity` | рядок підключення до бази `sable_identity` |
| `ConnectionStrings__Finance` | рядок підключення до бази `sable_finance` |
| `Jwt__Key` | ключ підпису токенів, щонайменше 64 символи |
| `Jwt__Issuer` | видавець токенів, наприклад `sable-api` |
| `Jwt__Audience` | аудиторія токенів, наприклад `sable-client` |
| `Cors__Origins__0` | дозволене джерело клієнта, наприклад `http://localhost:4200` |
| `Seed__AdminEmail`, `Seed__AdminPassword` | дані першого адміністратора |

Шаблон значень наведено у файлі `.env.example`.
