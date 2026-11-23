# Робоче місце для Sable на новому комп’ютері

Покрокова інструкція, як підготувати інший комп’ютер (Windows) до роботи з проєктом: запуск локально, тести, зміни й публікація. Детальніше про сервер і клієнт: [server/README.md](server/README.md) і [client/README.md](client/README.md).

## 1. Що встановити

| Інструмент | Версія | Навіщо | Обов’язково |
|---|---|---|---|
| Git | будь-яка свіжа | клонування й коміти | так |
| .NET SDK | 10.0.x | збірка й запуск API, серверні тести | так |
| Node.js + npm | 22 LTS (npm 10+) | клієнт Angular; ця ж версія в CI | так |
| Docker Desktop | будь-яка свіжа | локальна PostgreSQL і серверні тести (Testcontainers) | так |
| GitHub CLI (`gh`) | будь-яка свіжа | pull request-и, перегляд CI з терміналу | бажано |
| Azure CLI (`az`) | будь-яка свіжа | лише для адміністрування Azure вручну | ні |
| Rider або VS Code | — | редактор | на вибір |

Angular CLI окремо ставити не потрібно: він є в залежностях клієнта й запускається через `npm` або `npx ng`. `dotnet-ef` підключено як локальний інструмент (`dotnet tool restore`).

Встановлення через winget (PowerShell):

```powershell
winget install Git.Git
winget install Microsoft.DotNet.SDK.10
winget install OpenJS.NodeJS.LTS
winget install Docker.DockerDesktop
winget install GitHub.cli
winget install Microsoft.AzureCLI   # необов’язково
```

Перевірка:

```powershell
git --version
dotnet --version     # 10.0.x
node --version       # v22.x
docker --version
gh --version
```

## 2. Доступ до репозиторію

Репозиторій приватний, тому спершу треба увійти в GitHub:

```bash
gh auth login
gh repo clone unver1f1ed/sable-finance
cd sable-finance
```

Автор комітів має бути таким самим, як на основному комп’ютері:

```bash
git config user.name "Bohdan Paslavskyi"
git config user.email "153950197+unver1f1ed@users.noreply.github.com"
```

## 3. Секрети, яких немає в git

У репозиторії немає паролів і ключів. На новому комп’ютері їх треба задати один раз.

- `server/.env`: пароль локальної PostgreSQL. Створюється з `server/.env.example`.
- `dotnet user-secrets` проєкту `Sable.Api` (ідентифікатор `sable-api-dev`): рядки підключення, `Jwt:Key`, `Seed:AdminPassword`, `Seed:DemoPassword`.

Найпростіше перенести готові значення зі старого комп’ютера:

- файл `%APPDATA%\Microsoft\UserSecrets\sable-api-dev\secrets.json`;
- файл `server\.env`.

Скопіюйте обидва в ті самі місця на новому комп’ютері. Передавайте їх лише особисто (флешка, особистий хмарний диск), не через git і не через публічні чати.

Інший варіант: задати нові значення командами з розділу «Перший запуск» у [server/README.md](server/README.md). Тоді локальна база створиться з новими паролями. На опублікований сайт це ніяк не вплине.

## 4. Перший запуск

Сервер (з каталогу `server/`):

```bash
docker compose up -d                 # PostgreSQL на порту 5432, обидві бази
dotnet tool restore
dotnet run --project src/Sable.Api   # http://localhost:5080, /health -> {"status":"ok"}
```

Під час запуску міграції й початкові дані (адміністратор, демо-користувачі, тарифи, відгуки, довідка) застосовуються автоматично.

Клієнт (з каталогу `client/`, в іншому терміналі):

```bash
npm ci
npm start                            # http://localhost:4200
```

Локальний клієнт звертається до локального API (`src/environments/environment.ts`).

## 5. Перевірки перед комітом

```bash
# server/ (Docker має бути запущений)
dotnet build
dotnet test

# client/
npm run lint
npm test -- --watch=false
npm run build
```

Ті самі перевірки виконує GitHub Actions для кожного pull request-а (`server-ci`, `Client CI`).

## 6. Як зміни потрапляють на сайт

Вручну нічого розгортати не потрібно:

1. Зміни робляться в окремій гілці, далі pull request у `main`.
2. Після злиття в `main` GitHub Actions сам публікує:
   - клієнт (`client/**`) в Azure Static Web Apps: https://red-smoke-06a408310.5.azurestaticapps.net;
   - сервер (`server/**`) в Azure App Service: https://sable-api-qejdm.azurewebsites.net.
3. Ключі для публікації зберігаються в налаштуваннях репозиторію на GitHub (`AZURE_STATIC_WEB_APPS_API_TOKEN`, `AZURE_WEBAPP_PUBLISH_PROFILE`, змінна `AZURE_WEBAPP_NAME`) і переносити їх не треба.

Налаштування робочого сервера (рядки підключення, ключ JWT, паролі адміністратора й демо-користувачів) задані в Azure App Service (група ресурсів `rg-sable`, застосунок `sable-api-qejdm`, розділ Environment variables). Переглянути їх можна на порталі Azure або так:

```bash
az login
az webapp config appsettings list -g rg-sable -n sable-api-qejdm -o table
```

## 7. Типові проблеми

- **`dotnet test` падає з помилкою підключення до Docker:** запустіть Docker Desktop і дочекайтесь, поки він запуститься.
- **API зупиняється з переліком відсутніх налаштувань:** не задано user-secrets (розділ 3).
- **Порт 4200 або 5080 зайнятий:** закрийте попередній `npm start` / `dotnet run` або запустіть клієнт на іншому порту (`npx ng serve --port 4300`). Тоді додайте це джерело в CORS API: змінна середовища `Cors__Origins__1=http://localhost:4300`.
- **Помилка автентифікації в базі після перенесення:** пароль у `.env` не збігається з паролем у рядках підключення user-secrets, або том Docker створено зі старим паролем. Видаліть том командою `docker compose down -v` і запустіть базу знову (локальні дані буде втрачено).
