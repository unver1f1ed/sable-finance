import { Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { AppLayoutComponent } from './layouts/app-layout/app-layout.component';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';

const privateRoute = { noindex: true };

const devRoutes: Routes = environment.production
  ? []
  : [
      {
        path: 'dev/kit',
        title: 'UI-кіт — Sable',
        data: privateRoute,
        loadComponent: () => import('./features/dev/dev-kit.component').then((m) => m.DevKitComponent),
      },
    ];

export const routes: Routes = [
  ...devRoutes,
  {
    path: 'app',
    component: AppLayoutComponent,
    children: [
      {
        path: '',
        title: 'Огляд — Sable',
        data: privateRoute,
        loadComponent: () =>
          import('./features/cabinet/overview/overview-page.component').then((m) => m.OverviewPageComponent),
      },
      {
        path: 'transactions',
        title: 'Транзакції — Sable',
        data: privateRoute,
        loadComponent: () =>
          import('./features/cabinet/transactions/transactions-page.component').then(
            (m) => m.TransactionsPageComponent,
          ),
      },
      {
        path: 'planning',
        title: 'Планування — Sable',
        data: privateRoute,
        loadComponent: () =>
          import('./features/cabinet/planning/planning-page.component').then((m) => m.PlanningPageComponent),
      },
      {
        path: 'settings',
        title: 'Налаштування — Sable',
        data: privateRoute,
        loadComponent: () =>
          import('./features/cabinet/settings/settings-page.component').then((m) => m.SettingsPageComponent),
      },
    ],
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'users' },
      {
        path: 'users',
        title: 'Користувачі — адміністрування Sable',
        data: privateRoute,
        loadComponent: () =>
          import('./features/admin/users/admin-users-page.component').then((m) => m.AdminUsersPageComponent),
      },
      {
        path: 'plans',
        title: 'Тарифи — адміністрування Sable',
        data: privateRoute,
        loadComponent: () =>
          import('./features/admin/plans/admin-plans-page.component').then((m) => m.AdminPlansPageComponent),
      },
      {
        path: 'reviews',
        title: 'Відгуки — адміністрування Sable',
        data: privateRoute,
        loadComponent: () =>
          import('./features/admin/reviews/admin-reviews-page.component').then((m) => m.AdminReviewsPageComponent),
      },
      {
        path: 'faq',
        title: 'Довідка — адміністрування Sable',
        data: privateRoute,
        loadComponent: () =>
          import('./features/admin/faq/admin-faq-page.component').then((m) => m.AdminFaqPageComponent),
      },
    ],
  },
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        title: 'Sable — персональне фінансове планування',
        data: {
          description:
            'Sable допомагає вести облік доходів і витрат, планувати бюджет за категоріями та відкладати на фінансові цілі. Почніть безкоштовно.',
        },
        loadComponent: () => import('./features/public/home/home-page.component').then((m) => m.HomePageComponent),
      },
      {
        path: 'plans',
        title: 'Тарифи Sable — Старт і Плюс',
        data: {
          description:
            'Порівняйте тарифи Sable: безкоштовний Старт для обліку витрат і Плюс із необмеженими рахунками, цілями та аналітикою.',
        },
        loadComponent: () => import('./features/public/plans/plans-page.component').then((m) => m.PlansPageComponent),
      },
      {
        path: 'help',
        title: 'Довідка Sable — питання та відповіді',
        data: {
          description:
            'Відповіді на поширені питання про Sable: початок роботи, транзакції, бюджети, фінансові цілі, тарифи та безпеку даних.',
        },
        loadComponent: () => import('./features/public/help/help-page.component').then((m) => m.HelpPageComponent),
      },
      {
        path: 'about',
        title: 'Про Sable — сервіс і контакти',
        data: {
          description:
            'Дізнайтесь, як Sable допомагає планувати особисті фінанси, на яких принципах ми працюємо та як зв’язатися з підтримкою.',
        },
        loadComponent: () => import('./features/public/about/about-page.component').then((m) => m.AboutPageComponent),
      },
      {
        path: 'forbidden',
        title: 'Немає доступу — Sable',
        data: privateRoute,
        loadComponent: () =>
          import('./features/public/forbidden/forbidden-page.component').then((m) => m.ForbiddenPageComponent),
      },
      {
        path: '404',
        title: 'Сторінку не знайдено — Sable',
        data: {
          description: 'Сторінки за цією адресою немає. Поверніться на головну Sable або відкрийте довідку.',
        },
        loadComponent: () =>
          import('./features/public/not-found/not-found-page.component').then((m) => m.NotFoundPageComponent),
      },
      {
        path: '**',
        title: 'Сторінку не знайдено — Sable',
        data: {
          description: 'Сторінки за цією адресою немає. Поверніться на головну Sable або відкрийте довідку.',
        },
        loadComponent: () =>
          import('./features/public/not-found/not-found-page.component').then((m) => m.NotFoundPageComponent),
      },
    ],
  },
];
