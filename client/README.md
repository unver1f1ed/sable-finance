# Sable — клієнтська частина

Sable — навчальний проєкт: сайт сервісу персонального фінансового планування. Користувач веде
рахунки, доходи й витрати, ставить місячні бюджети за категоріями та фінансові цілі.
Адміністратор керує користувачами, тарифами, відгуками та довідкою.

Клієнт — Angular-застосунок. Публічні сторінки (`/`, `/plans`, `/help`, `/about`, `/404`)
пререндеряться в статичні файли, кабінет (`/app`) і адміністративна частина (`/admin`)
працюють на клієнті. Інтерфейс українською мовою.

## Адреси

- Клієнт: https://red-smoke-06a408310.5.azurestaticapps.net
- API: https://sable-api-qejdm.azurewebsites.net

## Тестові облікові записи

| Роль | Пошта |
|---|---|
| Адміністратор | admin@sable.ua |
| Звичайний користувач (демо) | demo@sable.ua |

Дані для входу надаються окремо.

## Запуск локально

Потрібні Node.js 20.19+ або 22+, npm 10+, .NET SDK та Docker (для бази PostgreSQL).

Сервер (з папки `server/`): запустити базу командою `docker compose up -d`, потім API
командою `dotnet run --project src/Sable.Api`. Рядок підключення, ключ JWT та паролі
початкових користувачів задаються через `dotnet user-secrets`, у репозиторії їх немає.
API слухає `http://localhost:5080`.

Клієнт (з папки `client/`):

```bash
npm install     # встановити залежності
npm start       # dev-сервер на http://localhost:4200
npm test        # модульні тести (Vitest)
npm run lint    # перевірка ESLint
npm run build   # production-збірка в dist/client/browser
```

Адреса API задається в `src/environments/environment.ts` (розробка) і
`src/environments/environment.production.ts` (production-збірка).

## Структура

```
public/                 статичні файли: іконки (sprite.svg), зображення, favicon, robots.txt,
                        sitemap.xml, конфігурація хостингу
src/
  app/
    core/               API-сервіси, моделі, авторизація, SEO
    features/           сторінки за розділами: public, cabinet, admin, auth
    layouts/            публічний макет, макет кабінету, макет адміністратора
    shared/             перевикористовувані UI-компоненти, директиви та утиліти
  environments/         налаштування середовищ
  styles/               глобальні стилі SCSS (токени, база, компоненти, макети, сторінки)
```

## Стилі

Усі стилі зібрані в `src/styles/` і підключаються через `styles.scss`. Компоненти не мають
власних стилів (`ViewEncapsulation.None`), класи названо за методологією BEM. Кольори
задано лише в `_tokens.scss`. Верстка Mobile First: базові стилі для телефонів, `min-width`
медіазапити для 768 px і 1024 px. Анімації вимикаються при `prefers-reduced-motion`.
