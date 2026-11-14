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
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { startWith } from 'rxjs';
import { GoalsApiService } from '../../../core/api/goals-api.service';
import { applyServerErrors, serverError } from '../../../core/forms/form-errors';
import { isApiError } from '../../../core/models/api-error';
import { GoalDto } from '../../../core/models/finance';
import { AmountFieldComponent } from '../../../shared/ui/amount-field/amount-field.component';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { CategoryIconComponent } from '../../../shared/ui/category-icon/category-icon.component';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { ProgressComponent } from '../../../shared/ui/progress/progress.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/select/select.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { toIsoDate } from '../../../shared/util/date';
import { formatMoney } from '../../../shared/util/format';
import { ReferenceDataStore } from '../data/reference-data.store';
import { contributionPreview, contributionSuggestions, remainingAmount, toKopecks } from './planning-logic';
import { tomorrowIso } from '../transactions/transaction-form';

@Component({
  selector: 'sb-contribution-modal',
  imports: [
    ReactiveFormsModule,
    AmountFieldComponent,
    ButtonDirective,
    CategoryIconComponent,
    FieldComponent,
    IconComponent,
    ModalComponent,
    ProgressComponent,
    SelectComponent,
  ],
  templateUrl: './contribution-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ContributionModalComponent {
  readonly open = input(false);
  readonly goal = input<GoalDto | null>(null);
  readonly closed = output<void>();
  readonly saved = output<void>();

  protected readonly maxDate = tomorrowIso();
  protected readonly form = new FormGroup({
    amount: new FormControl<number | null>(null),
    accountId: new FormControl('', { nonNullable: true }),
    occurredOn: new FormControl(toIsoDate(new Date()), { nonNullable: true }),
  });
  protected readonly sending = signal(false);
  protected readonly amount = toSignal(this.form.controls.amount.valueChanges.pipe(startWith(null as number | null)), {
    initialValue: null as number | null,
  });
  protected readonly accountId = toSignal(this.form.controls.accountId.valueChanges.pipe(startWith('')), { initialValue: '' });

  protected readonly remaining = computed(() => {
    const goal = this.goal();
    return goal ? remainingAmount(goal) : 0;
  });
  protected readonly suggestions = computed(() => {
    const goal = this.goal();
    return goal ? contributionSuggestions(goal.monthlyNeeded, this.remaining()) : [];
  });
  protected readonly accountOptions = computed<SelectOption[]>(() =>
    this.store.accounts().map((account) => ({ value: account.id, label: `${account.name} · ${formatMoney(account.balance)}` })),
  );
  protected readonly progressText = computed(() => {
    const goal = this.goal();
    return goal ? `${this.number(goal.currentAmount)} із ${formatMoney(goal.targetAmount)}` : '';
  });
  protected readonly progressPercent = computed(() => {
    const goal = this.goal();
    return goal && goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
  });
  protected readonly preview = computed(() => {
    const goal = this.goal();
    const amount = this.amount();
    if (!goal || amount === null || amount <= 0 || toKopecks(amount) > toKopecks(this.remaining())) {
      return null;
    }
    return contributionPreview(goal.currentAmount, goal.targetAmount, amount);
  });
  protected readonly lowBalance = computed(() => {
    const amount = this.amount();
    const account = this.store.accounts().find((item) => item.id === this.accountId());
    return amount !== null && account !== undefined && toKopecks(amount) > toKopecks(account.balance);
  });
  protected readonly amountError = computed(() => {
    const server = serverError(this.form.controls.amount);
    if (server) {
      return server;
    }
    if (!this.touched()) {
      return undefined;
    }
    const amount = this.amount();
    if (amount === null) {
      return 'Вкажіть суму внеску';
    }
    if (amount <= 0) {
      return 'Сума має бути більшою за нуль';
    }
    return toKopecks(amount) > toKopecks(this.remaining()) ? 'Сума внеску перевищує залишок до цілі' : undefined;
  });
  protected readonly submitLabel = computed(() => {
    const amount = this.amount();
    return amount !== null && amount > 0 ? `Внести ${formatMoney(amount)}` : 'Внести';
  });

  private readonly store = inject(ReferenceDataStore);
  private readonly api = inject(GoalsApiService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly touched = signal(false);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.form.reset({ amount: null, accountId: this.store.defaultAccount()?.id ?? '', occurredOn: toIsoDate(new Date()) });
      this.touched.set(false);
      this.sending.set(false);
    });
  }

  protected setAmount(value: number): void {
    this.form.controls.amount.setValue(value);
    this.touched.set(true);
  }

  protected chipLabel(value: number): string {
    return formatMoney(value);
  }

  protected money(value: number): string {
    return formatMoney(value);
  }

  protected number(value: number): string {
    return formatMoney(value).replace(/\s?₴$/, '');
  }

  protected submit(): void {
    this.touched.set(true);
    const goal = this.goal();
    const amount = this.amount();
    if (!goal || this.amountError() || amount === null || !this.form.controls.accountId.value) {
      this.host.nativeElement.querySelector<HTMLElement>('.field__control input')?.focus();
      return;
    }
    this.sending.set(true);
    this.api
      .contribute(goal.id, { amount, accountId: this.form.controls.accountId.value, occurredOn: this.form.controls.occurredOn.value })
      .subscribe({
        next: (updated) => {
          this.sending.set(false);
          this.toast.success('Внесок зараховано');
          if (updated.isAchieved) {
            this.toast.success(`Ціль «${updated.name}» досягнуто!`);
          }
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
            this.saved.emit();
          } else if (error.status === 400) {
            applyServerErrors(this.form, error);
          }
        },
      });
  }
}
