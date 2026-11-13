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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountsApiService } from '../../../core/api/accounts-api.service';
import { applyServerErrors, serverError } from '../../../core/forms/form-errors';
import { isApiError } from '../../../core/models/api-error';
import { AccountDto, AccountType } from '../../../core/models/finance';
import { AmountFieldComponent } from '../../../shared/ui/amount-field/amount-field.component';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SegmentedComponent, SegmentedOption } from '../../../shared/ui/segmented/segmented.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ToggleComponent } from '../../../shared/ui/toggle/toggle.component';

const BALANCE_LIMIT = 1_000_000_000;

@Component({
  selector: 'sb-account-modal',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AmountFieldComponent,
    ButtonDirective,
    FieldComponent,
    IconComponent,
    ModalComponent,
    SegmentedComponent,
    ToggleComponent,
  ],
  templateUrl: './account-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AccountModalComponent {
  readonly open = input(false);
  readonly account = input<AccountDto | null>(null);
  readonly isFirst = input(false);
  readonly closed = output<void>();
  readonly saved = output<AccountDto>();

  protected readonly typeOptions: SegmentedOption[] = [
    { value: 'Card', label: 'Картка' },
    { value: 'Cash', label: 'Готівка' },
    { value: 'Savings', label: 'Заощадження' },
  ];
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    type: new FormControl<AccountType>('Card', { nonNullable: true }),
    initialBalance: new FormControl<number | null>(0, {
      validators: [Validators.required, Validators.min(-BALANCE_LIMIT), Validators.max(BALANCE_LIMIT)],
    }),
    isDefault: new FormControl(false, { nonNullable: true }),
  });
  protected readonly sending = signal(false);
  protected readonly limitMessage = signal<string | null>(null);
  protected readonly editing = computed(() => this.account() !== null);
  protected readonly title = computed(() => (this.editing() ? 'Редагування рахунку' : 'Новий рахунок'));

  private readonly api = inject(AccountsApiService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly submitted = signal(false);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const account = this.account();
      this.form.reset(
        account
          ? { name: account.name, type: account.type, initialBalance: account.initialBalance, isDefault: account.isDefault }
          : { name: '', type: 'Card', initialBalance: 0, isDefault: this.isFirst() },
      );
      this.form.enable({ emitEvent: false });
      if (!account && this.isFirst()) {
        this.form.controls.isDefault.disable({ emitEvent: false });
      }
      this.submitted.set(false);
      this.limitMessage.set(null);
      this.sending.set(false);
    });
  }

  protected error(name: 'name' | 'initialBalance'): string | undefined {
    const control = this.form.controls[name];
    const server = serverError(control);
    if (server) {
      return server;
    }
    if (!control.errors || !(control.touched || this.submitted())) {
      return undefined;
    }
    if (control.errors['maxlength']) {
      return 'Не більше 60 символів';
    }
    if (control.errors['min'] || control.errors['max']) {
      return 'Сума має бути в межах від −1 000 000 000 до 1 000 000 000';
    }
    return 'Поле обов’язкове';
  }

  protected submit(): void {
    this.submitted.set(true);
    this.limitMessage.set(null);
    this.form.controls.name.setValue(this.form.controls.name.value.trim(), { emitEvent: false });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.host.nativeElement
        .querySelector<HTMLElement>(this.form.controls.name.invalid ? '[formControlName="name"]' : 'sb-amount-field input')
        ?.focus();
      return;
    }
    const raw = this.form.getRawValue();
    const input = {
      name: raw.name,
      type: raw.type,
      initialBalance: raw.initialBalance ?? 0,
      isDefault: this.isFirst() && !this.editing() ? true : raw.isDefault,
    };
    this.sending.set(true);
    const account = this.account();
    const request = account ? this.api.update(account.id, input) : this.api.create(input);
    request.subscribe({
      next: (result) => {
        this.sending.set(false);
        this.toast.success(account ? 'Зміни збережено' : 'Рахунок додано');
        this.saved.emit(result);
      },
      error: (error: unknown) => {
        this.sending.set(false);
        this.handleError(error);
      },
    });
  }

  private handleError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      return;
    }
    const body: unknown = error.error;
    if (error.status === 403 && isApiError(body) && body.code === 'plan_limit') {
      this.limitMessage.set(body.detail);
    } else if (error.status === 409 && isApiError(body)) {
      this.form.controls.name.setErrors({ server: body.detail });
      this.form.controls.name.markAsTouched();
    } else if (error.status === 400) {
      applyServerErrors(this.form, error);
    }
  }
}
