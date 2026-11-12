# Sable — клієнтська частина

Angular-застосунок сервісу персонального фінансового планування. Публічні сторінки
пререндеряться в статичні файли, кабінет і адміністративна частина працюють на клієнті.

## Вимоги

- Node.js 20.19+ або 22+
- npm 10+

## Команди

```bash
npm install     # встановити залежності
npm start       # dev-сервер на http://localhost:4200
npm run lint    # перевірка ESLint
npm run build   # production-збірка в dist/client/browser
```

Адреса API задається в `src/environments/environment.ts` (розробка) і
`src/environments/environment.production.ts` (production-збірка).

## Структура

```
public/                 статичні файли: іконки (sprite.svg), логотип, favicon, конфігурація хостингу
src/
  app/
    core/               сервіси застосунку (SEO, надалі API, авторизація)
    features/           сторінки за розділами: public, cabinet, admin
    layouts/            публічний макет, макет кабінету, макет адміністратора
    shared/ui/          перевикористовувані UI-компоненти
  environments/         налаштування середовищ
  styles/               глобальні стилі SCSS (токени, база, компоненти, макети, сторінки)
```

## Стилі

Усі стилі зібрані в `src/styles/` і підключаються через `styles.scss`. Компоненти не мають
власних стилів (`ViewEncapsulation.None`), класи названо за методологією BEM.
Верстка Mobile First: базові стилі для телефонів, `min-width` медіазапити для 768 px і 1024 px.
