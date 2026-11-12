import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, defer, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { isApiError } from '../models/api-error';
import { AUTH_RETRIED } from './http-context';
import { isApiRequest, isAuthEndpoint } from './api-url';

const REFRESH_AHEAD_MS = 10_000;

function withToken(request: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
}

export const authInterceptor: HttpInterceptorFn = (request, next: HttpHandlerFn) => {
  if (!isApiRequest(request.url)) {
    return next(request);
  }
  const auth = inject(AuthService);
  if (isAuthEndpoint(request.url)) {
    return next(request);
  }

  const send = (current: HttpRequest<unknown>): Observable<HttpEvent<unknown>> =>
    next(withToken(current, auth.token())).pipe(
      catchError((error: unknown) => {
        const unauthorized =
          error instanceof HttpErrorResponse &&
          error.status === 401 &&
          isApiError(error.error) &&
          error.error.code === 'unauthorized';
        if (!unauthorized || current.context.get(AUTH_RETRIED) || !auth.hasRefreshToken()) {
          return throwError(() => error);
        }
        return from(auth.refresh()).pipe(
          catchError(() => {
            void auth.handleSessionLost();
            return throwError(() => error);
          }),
          switchMap(() => send(current.clone({ context: current.context.set(AUTH_RETRIED, true) }))),
        );
      }),
    );

  return defer(() => {
    if (auth.token() && auth.tokenExpiresWithin(REFRESH_AHEAD_MS) && auth.hasRefreshToken()) {
      return from(auth.refresh().catch(() => undefined)).pipe(switchMap(() => send(request)));
    }
    return send(request);
  });
};
