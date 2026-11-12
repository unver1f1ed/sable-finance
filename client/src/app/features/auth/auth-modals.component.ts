import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { safeReturnUrl } from '../../core/auth/return-url';
import { PlanCode } from '../../core/models/auth';
import { LoginModalComponent } from './login-modal.component';
import { RegisterModalComponent } from './register-modal.component';

@Component({
  selector: 'sb-auth-modals',
  imports: [LoginModalComponent, RegisterModalComponent],
  template: `
    <sb-login-modal
      [open]="mode() === 'login'"
      (closed)="close()"
      (switchToRegister)="switchTo('register')"
      (signedIn)="goToReturnUrl()"
    />
    <sb-register-modal
      [open]="mode() === 'register'"
      [initialPlan]="plan()"
      (closed)="close()"
      (switchToLogin)="switchTo('login')"
      (registered)="registered.set(true)"
      (finished)="finish()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AuthModalsComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly registered = signal(false);

  protected readonly requested = computed(() => {
    const value = this.params().get('auth');
    return value === 'login' || value === 'register' ? value : null;
  });
  protected readonly mode = computed(() => {
    if (this.registered()) {
      return 'register';
    }
    return this.auth.status() === 'signedOut' ? this.requested() : null;
  });
  protected readonly plan = computed<PlanCode>(() => (this.params().get('plan') === 'plus' ? 'plus' : 'start'));

  constructor() {
    effect(() => {
      if (this.requested() && this.auth.isSignedIn() && !this.registered()) {
        void this.router.navigateByUrl(safeReturnUrl(this.params().get('returnUrl')), { replaceUrl: true });
      }
    });
  }

  protected close(): void {
    this.registered.set(false);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { auth: null, plan: null, returnUrl: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected switchTo(mode: 'login' | 'register'): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { auth: mode },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected goToReturnUrl(): void {
    void this.router.navigateByUrl(safeReturnUrl(this.params().get('returnUrl')));
  }

  protected finish(): void {
    this.registered.set(false);
    void this.router.navigateByUrl('/app');
  }
}
