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

3. Збережіть секрети застосунку в `dotnet user-secrets` (вони лежать поза репозиторієм). Підставте свої значення замість `<...>` (`Seed:DemoPassword` потрібен лише для демо-користувача `demo@sable.ua`, його створено з даними за пів року в середовищі Development); пароль у рядках підключення має збігатися з `POSTGRES_PASSWORD`:

   ```bash
   dotnet user-secrets set "ConnectionStrings:Identity" "Host=localhost;Port=5432;Username=sable;Password=<пароль бази>;Database=sable_identity" --project src/Sable.Api
   dotnet user-secrets set "ConnectionStrings:Finance" "Host=localhost;Port=5432;Username=sable;Password=<пароль бази>;Database=sable_finance" --project src/Sable.Api
   dotnet user-secrets set "Jwt:Key" "<щонайменше 64 випадкових символи>" --project src/Sable.Api
   dotnet user-secrets set "Seed:AdminPassword" "<пароль першого адміністратора>" --project src/Sable.Api
   dotnet user-secrets set "Seed:DemoPassword" "<пароль демо-користувача demo@sable.ua>" --project src/Sable.Api
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

## Ручні запити до API

У `src/Sable.Api/Sable.Api.http` зібрано готові запити для HTTP-клієнта Rider: публічні дані, вхід, кабінет, створення, зміна й видалення транзакції, приклади помилок 400, 401 і 403, оновлення токена, вихід та адміністративні запити. Середовище (`local`, `docker`, `production`) обирається на панелі редактора. Паролі тестових облікових записів зберігаються у файлі `http-client.private.env.json`, який не потрапляє до git: скопіюйте `http-client.private.env.example.json` і заповніть його. Запити виконуються згори вниз: вхід зберігає токени, а наступні запити їх використовують.

## Запуск API в Docker

API можна запустити в контейнері разом із базою. У `.env` (див. `.env.example`) мають бути `POSTGRES_PASSWORD`, `Jwt__Key`, `Seed__AdminPassword` і `Seed__DemoPassword`.

```bash
docker compose --profile api up -d --build
```

Контейнер працює в середовищі Development на `http://localhost:5081`. Команда `docker compose up -d` без профілю, як і раніше, запускає лише PostgreSQL.

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
| `Seed__Demo`, `Seed__DemoPassword` | `true` створює демо-користувача `demo@sable.ua` з даними (завжди в Development); пароль обов’язковий, без нього демо-дані пропускаються |

Шаблон значень наведено у файлі `.env.example`.

## Розгортання

Збірка для публікації (з каталогу `server/`):

```bash
dotnet publish src/Sable.Api -c Release -o publish
```

Застосунок запускається командою `dotnet publish/Sable.Api.dll` із `ASPNETCORE_ENVIRONMENT=Production`. Усі налаштування передаються змінними середовища; у продакшні запуск зупиняється з переліком усіх відсутніх обов’язкових значень.

| Ключ | Призначення | Обов’язковий |
|---|---|---|
| `ConnectionStrings__Identity` | рядок підключення до бази `sable_identity` | так |
| `ConnectionStrings__Finance` | рядок підключення до бази `sable_finance` | так |
| `Jwt__Key` | ключ підпису токенів, щонайменше 32 символи (рекомендовано 64) | так |
| `Jwt__Issuer` | видавець токенів | так |
| `Jwt__Audience` | аудиторія токенів | так |
| `Cors__Origins__0`, `Cors__Origins__1`, … | дозволені джерела клієнта (без `*`) | так, щонайменше одне |
| `Seed__AdminEmail`, `Seed__AdminPassword` | перший адміністратор; якщо користувач уже є, пароль не змінюється | ні |
| `Seed__Demo` | `true` створює демо-користувача `demo@sable.ua` з даними (без нього лише в Development) | ні |
| `Seed__DemoPassword` | пароль демо-користувача; без нього демо-дані не створюються | лише з `Seed__Demo` |
| `RateLimit__AuthPerMinute` | ліміт запитів на хвилину з однієї адреси для входу, реєстрації, оновлення токена й форми контактів (типово 10) | ні |
| `HttpsRedirection__Port` | порт для перенаправлення з HTTP на HTTPS (у `appsettings.Production.json` — 443) | ні |

Для Azure Database for PostgreSQL у рядках підключення додайте `SSL Mode=Require`, наприклад `Host=<сервер>.postgres.database.azure.com;Port=5432;Database=sable_finance;Username=<користувач>;Password=<пароль>;SSL Mode=Require`.

Особливості роботи за зворотним проксі (Azure App Service): поза Development застосунок довіряє заголовкам `X-Forwarded-For` і `X-Forwarded-Proto`, додає `Strict-Transport-Security` та заголовки безпеки й не показує заголовок `Server`. Міграції обох баз застосовуються під час запуску; для безпечного одночасного старту кількох екземплярів використовується блокування міграцій, яке реалізує провайдер Npgsql. Час міграцій і початкового наповнення пишеться в журнал одним рядком. Ендпоінт `GET /health` відкритий, не кешується й не обмежується за частотою.
