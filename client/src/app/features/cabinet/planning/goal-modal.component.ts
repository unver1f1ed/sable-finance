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
import { GoalsApiService } from '../../../core/api/goals-api.service';
import { applyServerErrors, serverError } from '../../../core/forms/form-errors';
import { isApiError } from '../../../core/models/api-error';
import { GoalDto } from '../../../core/models/finance';
import { AmountFieldComponent } from '../../../shared/ui/amount-field/amount-field.component';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { ColorPickerComponent } from '../../../shared/ui/color-picker/color-picker.component';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { IconPickerComponent } from '../../../shared/ui/icon-picker/icon-picker.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { toIsoDate } from '../../../shared/util/date';

const TARGET_MAX = 1_000_000_000;

@Component({
  selector: 'sb-goal-modal',
  imports: [ReactiveFormsModule, AmountFieldComponent, ButtonDirective, ColorPickerComponent, FieldComponent, IconPickerComponent, ModalComponent],
  templateUrl: './goal-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class GoalModalComponent {
  readonly open = input(false);
  readonly goal = input<GoalDto | null>(null);
  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly planLimit = output<string>();

  protected readonly today = toIsoDate(new Date());
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    targetAmount: new FormControl<number | null>(null, {
      validators: [
        (control) => {
          const value = control.value as number | null;
          if (value === null) {
            return { required: true };
          }
          if (value <= 0) {
            return { min: true };
          }
          return value > TARGET_MAX ? { max: true } : null;
        },
      ],
    }),
    deadline: new FormControl('', { nonNullable: true }),
    icon: new FormControl('pin', { nonNullable: true }),
    color: new FormControl('#6FDBD4', { nonNullable: true }),
  });
  protected readonly sending = signal(false);
  protected readonly editing = computed(() => this.goal() !== null);
  protected readonly title = computed(() => (this.editing() ? 'Редагування цілі' : 'Нова ціль'));

  private readonly api = inject(GoalsApiService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly submitted = signal(false);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const goal = this.goal();
      this.form.reset({
        name: goal?.name ?? '',
        targetAmount: goal?.targetAmount ?? null,
        deadline: goal?.deadline ?? '',
        icon: goal?.icon ?? 'pin',
        color: goal?.color ?? '#6FDBD4',
      });
      this.submitted.set(false);
      this.sending.set(false);
    });
  }

  protected error(name: 'name' | 'targetAmount' | 'deadline'): string | undefined {
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
    if (control.errors['min']) {
      return 'Сума має бути більшою за нуль';
    }
    if (control.errors['max']) {
      return 'Сума не може перевищувати 1 000 000 000';
    }
    return name === 'targetAmount' ? 'Вкажіть цільову суму' : 'Поле обов’язкове';
  }

  protected clearDeadline(): void {
    this.form.controls.deadline.setValue('');
  }

  protected submit(): void {
    this.submitted.set(true);
    this.form.controls.name.setValue(this.form.controls.name.value.trim(), { emitEvent: false });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.host.nativeElement
        .querySelector<HTMLElement>(this.form.controls.name.invalid ? '[formControlName="name"]' : '.field__control input')
        ?.focus();
      return;
    }
    const raw = this.form.getRawValue();
    const input = {
      name: raw.name,
      targetAmount: raw.targetAmount as number,
      deadline: raw.deadline || null,
      icon: raw.icon,
      color: raw.color,
    };
    const existing = this.goal();
    this.sending.set(true);
    const request = existing ? this.api.update(existing.id, input) : this.api.create(input);
    request.subscribe({
      next: () => {
        this.sending.set(false);
        this.toast.success(existing ? 'Зміни збережено' : 'Ціль створено');
        this.saved.emit();
      },
      error: (error: unknown) => {
        this.sending.set(false);
        if (!(error instanceof HttpErrorResponse)) {
          return;
        }
        const body: unknown = error.error;
        if (error.status === 403 && isApiError(body) && body.code === 'plan_limit') {
          this.planLimit.emit(body.detail);
        } else if (error.status === 400) {
          applyServerErrors(this.form, error);
        }
      },
    });
  }
}
