# Sable: клієнтська частина

Сайт сервісу персонального фінансового планування на Angular.

- **Публічні сторінки:** головна, тарифи, довідка, про сервіс, сторінка 404.
- **Кабінет користувача:** рахунки, доходи й витрати, бюджети, фінансові цілі, налаштування.
- **Адміністративна частина:** користувачі, тарифи, відгуки, довідка.

Опублікована версія: https://red-smoke-06a408310.5.azurestaticapps.net

## Технології

Angular, TypeScript, SCSS (Flexbox, Grid, Mobile First), Vitest, ESLint. Публічні сторінки заздалегідь рендеряться в HTML, кабінет і адмінка працюють у браузері. Усі дані приходять із REST API.

## Запуск

Потрібен Node.js 22. Для роботи з даними має бути запущений сервер (див. [server/README.md](../server/README.md)).

```bash
npm ci          # встановити залежності
npm start       # http://localhost:4200
npm test        # тести
npm run lint    # перевірка коду
npm run build   # збірка в dist/client/browser
```

Адреса API: `src/environments/environment.ts` (локально) і `src/environments/environment.production.ts` (опублікована версія).

## Структура

```
public/            зображення, іконки, шрифти, favicon
src/app/core/      робота з API, вхід, моделі
src/app/features/  сторінки: публічні, кабінет, адмінка
src/app/layouts/   макети сторінок
src/app/shared/    спільні компоненти
src/styles/        стилі
```

## Тестові облікові записи

Адміністратор `admin@sable.ua`, користувач `demo@sable.ua`. Паролі надаються окремо.
