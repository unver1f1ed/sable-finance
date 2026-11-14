import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApiService } from '../../../core/api/auth-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { applyServerErrors, serverError } from '../../../core/forms/form-errors';
import { isApiError } from '../../../core/models/api-error';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { DELETE_CONFIRM_WORD, canDeleteAccount } from './settings-logic';

@Component({
  selector: 'sb-delete-account-modal',
  imports: [ReactiveFormsModule, ButtonDirective, FieldComponent, IconComponent, ModalComponent],
  templateUrl: './delete-account-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class DeleteAccountModalComponent {
  readonly open = input(false);
  readonly closed = output<void>();

  protected readonly word = DELETE_CONFIRM_WORD;
  protected readonly form = new FormGroup({
    password: new FormControl('', { nonNullable: true }),
    confirmation: new FormControl('', { nonNullable: true }),
  });
  protected readonly sending = signal(false);

  private readonly values = signal({ password: '', confirmation: '' });
  protected readonly canDelete = computed(() => canDeleteAccount(this.values().password, this.values().confirmation));

  private readonly authApi = inject(AuthApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  constructor() {
    this.form.valueChanges.subscribe(() => this.values.set(this.form.getRawValue()));
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.form.reset();
      this.values.set({ password: '', confirmation: '' });
      this.sending.set(false);
    });
  }

  protected passwordError(): string | undefined {
    return serverError(this.form.controls.password);
  }

  protected submit(): void {
    if (!this.canDelete() || this.sending()) {
      return;
    }
    this.sending.set(true);
    this.authApi.deleteAccount({ password: this.form.controls.password.value }).subscribe({
      next: () => {
        this.sending.set(false);
        this.auth.clearSession();
        this.toast.success('Акаунт видалено');
        void this.router.navigateByUrl('/');
        this.closed.emit();
      },
      error: (error: unknown) => {
        this.sending.set(false);
        if (!(error instanceof HttpErrorResponse)) {
          return;
        }
        if (error.status === 400 && applyServerErrors(this.form, error)) {
          return;
        }
        const body: unknown = error.error;
        if (error.status >= 400 && error.status < 500 && error.status !== 429 && isApiError(body)) {
          this.form.controls.password.setErrors({ server: body.detail });
          this.form.controls.password.markAsTouched();
        }
      },
    });
  }
}
