import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { DOCUMENT, ViewportScroller } from '@angular/common';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { authInterceptor } from './core/api/auth.interceptor';
import { errorInterceptor } from './core/api/error.interceptor';
import { AuthService } from './core/auth/auth.service';
import { SeoService } from './core/seo/seo.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })),
    provideHttpClient(withFetch(), withInterceptors([errorInterceptor, authInterceptor])),
    provideClientHydration(),
    provideAppInitializer(() => inject(SeoService).init()),
    provideAppInitializer(() => {
      void inject(AuthService).init();
    }),
    provideAppInitializer(() => {
      const document = inject(DOCUMENT);
      inject(ViewportScroller).setOffset(() => {
        const value = document.defaultView?.getComputedStyle(document.documentElement).getPropertyValue('--header-offset');
        return [0, parseFloat(value ?? '0') || 0];
      });
    }),
  ],
};
