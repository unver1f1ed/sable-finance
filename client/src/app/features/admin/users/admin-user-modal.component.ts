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
import { AdminUsersApiService } from '../../../core/api/admin-users-api.service';
import { applyServerErrors, serverError } from '../../../core/forms/form-errors';
import { isApiError } from '../../../core/models/api-error';
import { AdminUserDto } from '../../../core/models/admin';
import { Role } from '../../../core/models/auth';
import { PlanCode } from '../../../core/models/public-content';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SegmentedComponent, SegmentedOption } from '../../../shared/ui/segmented/segmented.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/select/select.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ToggleComponent } from '../../../shared/ui/toggle/toggle.component';

type UserField = 'firstName' | 'lastName';

@Component({
  selector: 'sb-admin-user-modal',
  imports: [
    ReactiveFormsModule,
    AvatarComponent,
    ButtonDirective,
    FieldComponent,
    ModalComponent,
    SegmentedComponent,
    SelectComponent,
    ToggleComponent,
  ],
  templateUrl: './admin-user-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AdminUserModalComponent {
  readonly open = input(false);
  readonly user = input<AdminUserDto | null>(null);
  readonly planOptions = input<SelectOption[]>([]);
  readonly isSelf = input(false);
  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly deleteRequested = output<AdminUserDto>();

  protected readonly roleOptions: SegmentedOption[] = [
    { value: 'User', label: 'Користувач' },
    { value: 'Admin', label: 'Адміністратор' },
  ];
  protected readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    role: new FormControl<Role>('User', { nonNullable: true }),
    planCode: new FormControl<PlanCode>('start', { nonNullable: true }),
    isBlocked: new FormControl(false, { nonNullable: true }),
  });
  protected readonly sending = signal(false);

  private readonly api = inject(AdminUsersApiService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly submitted = signal(false);

  constructor() {
    effect(() => {
      const user = this.user();
      if (!this.open() || !user) {
        return;
      }
      this.form.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        planCode: user.planCode,
        isBlocked: user.isBlocked,
      });
      this.form.enable({ emitEvent: false });
      if (this.isSelf()) {
        this.form.controls.role.disable({ emitEvent: false });
        this.form.controls.isBlocked.disable({ emitEvent: false });
      }
      this.submitted.set(false);
      this.sending.set(false);
    });
  }

  protected error(name: UserField): string | undefined {
    const control = this.form.controls[name];
    const server = serverError(control);
    if (server) {
      return server;
    }
    if (!control.errors || !(control.touched || this.submitted())) {
      return undefined;
    }
    return control.errors['maxlength'] ? 'Не більше 60 символів' : 'Поле обов’язкове';
  }

  protected requestDelete(): void {
    const user = this.user();
    if (user) {
      this.deleteRequested.emit(user);
    }
  }

  protected submit(): void {
    this.submitted.set(true);
    const user = this.user();
    this.form.patchValue(
      { firstName: this.form.controls.firstName.value.trim(), lastName: this.form.controls.lastName.value.trim() },
      { emitEvent: false },
    );
    if (!user || this.form.invalid) {
      this.form.markAllAsTouched();
      this.host.nativeElement
        .querySelector<HTMLElement>(this.form.controls.firstName.invalid ? '[formControlName="firstName"]' : '[formControlName="lastName"]')
        ?.focus();
      return;
    }
    this.sending.set(true);
    this.api.update(user.id, this.form.getRawValue()).subscribe({
      next: () => {
        this.sending.set(false);
        this.toast.success('Зміни збережено');
        this.saved.emit();
      },
      error: (error: unknown) => {
        this.sending.set(false);
        if (!(error instanceof HttpErrorResponse)) {
          return;
        }
        const body: unknown = error.error;
        if (error.status === 409 && isApiError(body)) {
          this.toast.error(body.detail);
        } else if (error.status === 400) {
          applyServerErrors(this.form, error);
        }
      },
    });
  }
}
