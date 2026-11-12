import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

async function requireSignIn(url: string): Promise<true | UrlTree> {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready();
  if (auth.isSignedIn()) {
    return true;
  }
  return router.createUrlTree(['/'], { queryParams: { auth: 'login', returnUrl: url } });
}

export const authGuard: CanActivateFn & CanActivateChildFn = (_route, state) => requireSignIn(state.url);

export const adminGuard: CanActivateFn & CanActivateChildFn = async (_route, state) => {
  const result = await requireSignIn(state.url);
  if (result !== true) {
    return result;
  }
  const auth = inject(AuthService);
  return auth.isAdmin() ? true : inject(Router).createUrlTree(['/forbidden']);
};
