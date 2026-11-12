import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { map, startWith } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { applyServerErrors } from '../../core/forms/form-errors';
import { isApiError } from '../../core/models/api-error';
import { PlanCode } from '../../core/models/auth';
import { ButtonDirective } from '../../shared/ui/button/button.directive';
import { CheckboxComponent } from '../../shared/ui/checkbox/checkbox.component';
import { FieldComponent } from '../../shared/ui/field/field.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { formatPrice } from '../../shared/util/format';
import { PublicContentService } from '../public/data/public-content.service';
import {
  RegisterField,
  createRegisterForm,
  passwordStrength,
  registerFieldError,
} from './register-form';

const FIELD_ORDER: RegisterField[] = ['firstName', 'lastName', 'email', 'password', 'repeatPassword', 'terms'];

@Component({
  selector: 'sb-register-modal',
  imports: [ReactiveFormsModule, ButtonDirective, CheckboxComponent, FieldComponent, IconComponent, ModalComponent],
  templateUrl: './register-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class RegisterModalComponent {
  readonly open = input(false);
  readonly initialPlan = input<PlanCode>('start');
  readonly closed = output<void>();
  readonly switchToLogin = output<void>();
  readonly registered = output<void>();
  readonly finished = output<void>();

  protected readonly form: FormGroup = createRegisterForm();
  protected readonly sending = signal(false);
  protected readonly createdName = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly passwordHint = 'Надійний пароль · щонайменше 8 символів, літери й цифри';
  protected readonly strengthBars = [0, 1, 2, 3];
  protected readonly plusPrice = computed(() => {
    const plus = this.plans().plans.find((plan) => plan.code === 'plus');
    return formatPrice(plus?.priceYearlyPerMonth ?? 0);
  });
  protected readonly strength = toSignal(
    this.form.controls['password'].valueChanges.pipe(
      startWith(''),
      map((value: string) => passwordStrength(value)),
    ),
    { initialValue: 0 },
  );

  private readonly auth = inject(AuthService);
  private readonly plans = inject(PublicContentService).plans();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly submitted = signal(false);

  constructor() {
    effect(() => {
      const open = this.open();
      const plan = this.initialPlan();
      if (open) {
        this.form.controls['plan'].setValue(plan);
      } else {
        this.reset();
      }
    });
  }

  protected error(name: RegisterField): string | undefined {
    const control = this.form.controls[name];
    const message = registerFieldError(this.form, name);
    if (!message) {
      return undefined;
    }
    const visible = control.touched || this.submitted() || !!control.errors?.['server'];
    return visible ? message : undefined;
  }

  protected togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }
    this.sending.set(true);
    this.form.disable({ emitEvent: false });
    const value = this.form.getRawValue() as {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      plan: PlanCode;
    };
    try {
      const user = await this.auth.register({
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        email: value.email.trim(),
        password: value.password,
        planCode: value.plan,
      });
      this.sending.set(false);
      this.form.enable({ emitEvent: false });
      this.form.reset({ plan: value.plan });
      this.createdName.set(user.firstName);
      this.registered.emit();
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
    if (error.status === 409 && isApiError(body) && body.code === 'email_taken') {
      this.form.controls['email'].setErrors({ server: body.detail });
      this.form.controls['email'].markAsTouched();
      this.focusFirstInvalid();
    } else if (error.status === 400 && applyServerErrors(this.form, error)) {
      this.focusFirstInvalid();
    }
  }

  private focusFirstInvalid(): void {
    for (const name of FIELD_ORDER) {
      if (!this.error(name)) {
        continue;
      }
      let element = this.host.nativeElement.querySelector<HTMLElement>(`[formControlName="${name}"]`);
      if (element && element.tagName === 'SB-CHECKBOX') {
        element = element.querySelector<HTMLElement>('input');
      }
      element?.focus();
      return;
    }
  }

  private reset(): void {
    this.form.reset({ plan: 'start' });
    this.form.enable({ emitEvent: false });
    this.sending.set(false);
    this.submitted.set(false);
    this.createdName.set(null);
    this.showPassword.set(false);
  }
}
