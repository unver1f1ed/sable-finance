import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { applyServerErrors, serverError } from '../../core/forms/form-errors';
import { isApiError } from '../../core/models/api-error';
import { ButtonDirective } from '../../shared/ui/button/button.directive';
import { CheckboxComponent } from '../../shared/ui/checkbox/checkbox.component';
import { FieldComponent } from '../../shared/ui/field/field.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { EMAIL_MESSAGE, EMAIL_PATTERN, REQUIRED_MESSAGE } from './register-form';

@Component({
  selector: 'sb-login-modal',
  imports: [ReactiveFormsModule, ButtonDirective, CheckboxComponent, FieldComponent, IconComponent, ModalComponent],
  templateUrl: './login-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class LoginModalComponent {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly switchToRegister = output<void>();
  readonly signedIn = output<void>();

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(EMAIL_PATTERN)] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    remember: new FormControl(true, { nonNullable: true }),
  });
  protected readonly sending = signal(false);
  protected readonly banner = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly submitted = signal(false);

  constructor() {
    effect(() => {
      if (!this.open()) {
        this.reset();
      }
    });
  }

  protected error(name: 'email' | 'password'): string | undefined {
    const control = this.form.controls[name];
    const server = serverError(control);
    if (server) {
      return server;
    }
    if (!control.errors || !(control.touched || this.submitted())) {
      return undefined;
    }
    return control.errors['required'] ? REQUIRED_MESSAGE : EMAIL_MESSAGE;
  }

  protected togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  protected forgotPassword(): void {
    this.toast.info('Відновлення пароля поки недоступне. Напишіть на help@sable.ua.');
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.banner.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focus(this.form.controls.email.invalid ? 'email' : 'password');
      return;
    }
    this.sending.set(true);
    this.form.disable({ emitEvent: false });
    const { email, password, remember } = this.form.getRawValue();
    try {
      await this.auth.login({ email: email.trim(), password }, remember);
      this.sending.set(false);
      this.signedIn.emit();
    } catch (error) {
      this.sending.set(false);
      this.form.enable({ emitEvent: false });
      this.handleError(error);
    }
  }

  private handleError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      return;
    }
    const body: unknown = error.error;
    if (error.status === 401 && isApiError(body) && body.code === 'invalid_credentials') {
      this.showBanner(body.detail);
    } else if (error.status === 403 && isApiError(body) && body.code === 'account_blocked') {
      this.showBanner(body.detail);
    } else if (error.status === 400 && applyServerErrors(this.form, error)) {
      this.focus(this.form.controls.email.invalid ? 'email' : 'password');
    }
  }

  private showBanner(message: string): void {
    this.banner.set(message);
    this.form.controls.password.reset('');
    this.focus('password');
  }

  private focus(name: 'email' | 'password'): void {
    this.host.nativeElement.querySelector<HTMLElement>(`[formControlName="${name}"]`)?.focus();
  }

  private reset(): void {
    this.form.reset({ email: '', password: '', remember: true });
    this.form.enable({ emitEvent: false });
    this.sending.set(false);
    this.submitted.set(false);
    this.banner.set(null);
    this.showPassword.set(false);
  }
}
