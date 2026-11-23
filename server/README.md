# Sable: серверна частина

REST API сервісу персонального фінансового планування: реєстрація і вхід, рахунки, транзакції, бюджети, цілі, публічний вміст і адміністрування.

Опублікована версія: https://sable-api-qejdm.azurewebsites.net (перевірка: `/health`).

## Технології

ASP.NET Core (.NET 10), Entity Framework Core, ASP.NET Core Identity (паролі зберігаються хешованими), JWT, PostgreSQL 16. Дві бази даних: `sable_identity` (користувачі) і `sable_finance` (фінансові дані та вміст сайту).

```
src/Sable.Domain          сутності
src/Sable.Application     бізнес-логіка і перевірка даних
src/Sable.Infrastructure  база даних, вхід, початкові дані
src/Sable.Api             контролери, обробка помилок
tests/Sable.Tests         інтеграційні тести
```

## Запуск

Потрібні .NET SDK 10 і Docker.

1. Створити `.env` з `.env.example` і вказати пароль бази:

   ```bash
   cp .env.example .env
   ```

2. Запустити базу:

   ```bash
   docker compose up -d
   ```

3. Задати секрети (у репозиторії їх немає). Пароль бази має збігатися з `.env`:

   ```bash
   dotnet user-secrets set "ConnectionStrings:Identity" "Host=localhost;Port=5432;Username=sable;Password=<пароль>;Database=sable_identity" --project src/Sable.Api
   dotnet user-secrets set "ConnectionStrings:Finance" "Host=localhost;Port=5432;Username=sable;Password=<пароль>;Database=sable_finance" --project src/Sable.Api
   dotnet user-secrets set "Jwt:Key" "<щонайменше 64 випадкові символи>" --project src/Sable.Api
   dotnet user-secrets set "Seed:AdminPassword" "<пароль адміністратора>" --project src/Sable.Api
   dotnet user-secrets set "Seed:DemoPassword" "<пароль демо-користувачів>" --project src/Sable.Api
   ```

4. Запустити API:

   ```bash
   dotnet run --project src/Sable.Api
   ```

API працює на `http://localhost:5080`. Таблиці та початкові дані (тарифи, відгуки, довідка, адміністратор і демо-користувачі) створюються автоматично під час запуску.

## Тести

```bash
dotnet test
```

Тести самі запускають PostgreSQL у контейнері, тому Docker має працювати.

## Налаштування на сервері

На опублікованому сервері налаштування задаються змінними середовища:

| Змінна | Призначення |
|---|---|
| `ConnectionStrings__Identity`, `ConnectionStrings__Finance` | підключення до баз даних |
| `Jwt__Key`, `Jwt__Issuer`, `Jwt__Audience` | підпис токенів входу |
| `Cors__Origins__0` | адреса сайту, якому дозволено звертатися до API |
| `Seed__AdminEmail`, `Seed__AdminPassword` | перший адміністратор |
| `Seed__Demo`, `Seed__DemoPassword` | демо-користувачі з даними |

Публікація відбувається автоматично через GitHub Actions після злиття змін у `main`.
