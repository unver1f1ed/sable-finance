import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn & CanActivateChildFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready();
  if (auth.isSignedIn()) {
    return true;
  }
  return router.createUrlTree(['/'], { queryParams: { auth: 'login', returnUrl: state.url } });
};

export const adminGuard: CanActivateFn & CanActivateChildFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready();
  if (!auth.isSignedIn()) {
    return router.createUrlTree(['/'], { queryParams: { auth: 'login', returnUrl: state.url } });
  }
  return auth.isAdmin() ? true : router.createUrlTree(['/forbidden']);
};

export const signedInMatch: CanMatchFn = async () => {
  const auth = inject(AuthService);
  await auth.ready();
  return auth.isSignedIn();
};
