import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { isApiError } from '../models/api-error';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { isApiRequest } from './api-url';
import { SKIP_ERROR_TOAST } from './http-context';

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiRequest(request.url)) {
    return next(request);
  }
  const toast = inject(ToastService);
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || request.context.get(SKIP_ERROR_TOAST)) {
        return throwError(() => error);
      }
      const body: unknown = error.error;
      const detail = isApiError(body) ? body.detail : null;
      if (error.status === 0) {
        toast.error('Немає з’єднання із сервером. Перевірте інтернет і спробуйте ще раз.');
      } else if (error.status === 429) {
        toast.error(detail ?? 'Забагато запитів. Спробуйте за хвилину.');
      } else if (error.status >= 500) {
        toast.error(detail ?? 'Сталася помилка. Спробуйте пізніше.');
      } else if (error.status === 403 && isApiError(body) && body.code === 'account_blocked') {
        auth.clearSession();
        toast.error(body.detail);
      } else if (error.status === 403 && request.url.includes('/api/admin/')) {
        void router.navigateByUrl('/forbidden');
      }
      return throwError(() => error);
    }),
  );
};
