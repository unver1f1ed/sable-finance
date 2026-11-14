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
import { firstValueFrom } from 'rxjs';
import { AuthApiService } from '../../../core/api/auth-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { applyServerErrors, serverError } from '../../../core/forms/form-errors';
import { isApiError } from '../../../core/models/api-error';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { MISMATCH_MESSAGE, PASSWORD_RULE_MESSAGE, REQUIRED_MESSAGE, passwordRule } from '../../auth/register-form';

type PasswordField = 'currentPassword' | 'newPassword' | 'repeatPassword';

@Component({
  selector: 'sb-password-modal',
  imports: [ReactiveFormsModule, ButtonDirective, FieldComponent, IconComponent, ModalComponent],
  templateUrl: './password-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PasswordModalComponent {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly changed = output<void>();

  protected readonly passwordHint = PASSWORD_RULE_MESSAGE;
  protected readonly form = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, passwordRule, Validators.maxLength(100)] }),
    repeatPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly sending = signal(false);

  private readonly authApi = inject(AuthApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly submitted = signal(false);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.form.reset();
      this.submitted.set(false);
      this.sending.set(false);
    });
  }

  protected error(name: PasswordField): string | undefined {
    const control = this.form.controls[name];
    const server = serverError(control);
    if (server) {
      return server;
    }
    const show = control.touched || this.submitted();
    if (name === 'repeatPassword' && show && !control.errors && this.form.controls.newPassword.value !== control.value) {
      return MISMATCH_MESSAGE;
    }
    if (!control.errors || !show) {
      return undefined;
    }
    if (control.errors['required']) {
      return REQUIRED_MESSAGE;
    }
    return control.errors['maxlength'] ? 'Не більше 100 символів' : PASSWORD_RULE_MESSAGE;
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    const { currentPassword, newPassword, repeatPassword } = this.form.getRawValue();
    const names: PasswordField[] = ['currentPassword', 'newPassword', 'repeatPassword'];
    const invalid = names.find((name) => this.form.controls[name].invalid);
    if (invalid || newPassword !== repeatPassword) {
      this.form.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>(`[formControlName="${invalid ?? 'repeatPassword'}"]`)?.focus();
      return;
    }
    const email = this.auth.user()?.email ?? '';
    this.sending.set(true);
    try {
      await firstValueFrom(this.authApi.changePassword({ currentPassword, newPassword }));
    } catch (error) {
      this.sending.set(false);
      this.handleError(error);
      return;
    }
    try {
      const session = await firstValueFrom(this.authApi.login({ email, password: newPassword }));
      this.auth.setSession(session);
      this.toast.success('Пароль змінено. Увійдіть знову на інших пристроях.');
      this.sending.set(false);
      this.changed.emit();
    } catch {
      this.sending.set(false);
      this.toast.success('Пароль змінено. Увійдіть із новим паролем.');
      await this.auth.handleSessionLost();
    }
  }

  private handleError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      return;
    }
    if (error.status === 400 && applyServerErrors(this.form, error)) {
      return;
    }
    const body: unknown = error.error;
    if (error.status >= 400 && error.status < 500 && error.status !== 429 && isApiError(body)) {
      this.form.controls.currentPassword.setErrors({ server: body.detail });
      this.form.controls.currentPassword.markAsTouched();
    }
  }
}
