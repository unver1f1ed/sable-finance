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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of, startWith } from 'rxjs';
import { BudgetsApiService } from '../../../core/api/budgets-api.service';
import { TransactionsApiService } from '../../../core/api/transactions-api.service';
import { applyServerErrors, serverError } from '../../../core/forms/form-errors';
import { isApiError } from '../../../core/models/api-error';
import { BudgetDto } from '../../../core/models/finance';
import { AmountFieldComponent } from '../../../shared/ui/amount-field/amount-field.component';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/select/select.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ToggleComponent } from '../../../shared/ui/toggle/toggle.component';
import { currentMonth, monthRange, shiftMonth } from '../../../shared/util/date';
import { formatMoney } from '../../../shared/util/format';
import { ReferenceDataStore } from '../data/reference-data.store';
import { toKopecks } from './planning-logic';

const LIMIT_MAX = 1_000_000_000;

@Component({
  selector: 'sb-budget-modal',
  imports: [ReactiveFormsModule, AmountFieldComponent, ButtonDirective, IconComponent, ModalComponent, SelectComponent, ToggleComponent],
  templateUrl: './budget-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class BudgetModalComponent {
  readonly open = input(false);
  readonly budget = input<BudgetDto | null>(null);
  readonly usedCategoryIds = input<string[]>([]);
  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly planLimit = output<string>();

  protected readonly form = new FormGroup({
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    limitAmount: new FormControl<number | null>(null, {
      validators: [(control) => limitRule(control.value as number | null)],
    }),
    recurring: new FormControl({ value: true, disabled: true }, { nonNullable: true }),
    warn: new FormControl({ value: true, disabled: true }, { nonNullable: true }),
  });
  protected readonly sending = signal(false);
  protected readonly average = signal<number | null>(null);
  protected readonly editing = computed(() => this.budget() !== null);
  protected readonly title = computed(() => (this.editing() ? 'Змінити ліміт' : 'Новий бюджет'));
  protected readonly categoryId = toSignal(this.form.controls.categoryId.valueChanges.pipe(startWith('')), { initialValue: '' });
  protected readonly categoryOptions = computed<SelectOption[]>(() => {
    const used = new Set(this.usedCategoryIds());
    return this.store
      .expenseCategories()
      .filter((category) => !category.isGoalContribution && !used.has(category.id))
      .map((category) => ({ value: category.id, label: category.name }));
  });
  protected readonly noCategoriesLeft = computed(() => !this.editing() && this.categoryOptions().length === 0);
  protected readonly hint = computed(() => {
    const average = this.average();
    const category = this.store.category(this.categoryId());
    return average !== null && category ? `За останні 3 місяці ви витрачали на «${category.name}» в середньому ${formatMoney(average)}.` : '';
  });

  private readonly store = inject(ReferenceDataStore);
  private readonly api = inject(BudgetsApiService);
  private readonly transactions = inject(TransactionsApiService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly submitted = signal(false);
  private hintRequest = 0;

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const budget = this.budget();
      this.form.reset({
        categoryId: budget?.category.id ?? '',
        limitAmount: budget?.limitAmount ?? null,
        recurring: true,
        warn: true,
      });
      this.submitted.set(false);
      this.sending.set(false);
      this.average.set(null);
    });
    effect(() => {
      const id = this.categoryId();
      if (this.open() && id && !this.editing()) {
        this.loadAverage(id);
      } else {
        this.average.set(null);
      }
    });
  }

  protected error(name: 'categoryId' | 'limitAmount'): string | undefined {
    const control = this.form.controls[name];
    const server = serverError(control);
    if (server) {
      return server;
    }
    if (!control.errors || !(control.touched || this.submitted())) {
      return undefined;
    }
    if (control.errors['min']) {
      return 'Сума має бути більшою за нуль';
    }
    if (control.errors['max']) {
      return 'Сума не може перевищувати 1 000 000 000';
    }
    return name === 'categoryId' ? 'Оберіть категорію' : 'Вкажіть ліміт';
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.host.nativeElement
        .querySelector<HTMLElement>(this.form.controls.categoryId.invalid && !this.editing() ? 'sb-select select' : '.field__control input')
        ?.focus();
      return;
    }
    const limit = this.form.controls.limitAmount.value as number;
    const existing = this.budget();
    this.sending.set(true);
    const request = existing
      ? this.api.update(existing.id, limit)
      : this.api.create({ categoryId: this.form.controls.categoryId.value, limitAmount: limit });
    request.subscribe({
      next: () => {
        this.sending.set(false);
        this.toast.success(existing ? 'Ліміт змінено' : 'Бюджет створено');
        this.saved.emit();
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
      this.planLimit.emit(body.detail);
    } else if (error.status === 409 && isApiError(body)) {
      this.form.controls.categoryId.setErrors({ server: body.detail });
      this.form.controls.categoryId.markAsTouched();
    } else if (error.status === 400) {
      applyServerErrors(this.form, error);
    }
  }

  private loadAverage(categoryId: string): void {
    const request = ++this.hintRequest;
    const month = currentMonth();
    const requests = [1, 2, 3].map((offset) => {
      const range = monthRange(shiftMonth(month, -offset));
      return this.transactions
        .list({ categoryId, type: 'Expense', from: range?.from, to: range?.to, pageSize: 10 })
        .pipe(catchError(() => of(null)));
    });
    forkJoin(requests).subscribe((results) => {
      if (request !== this.hintRequest) {
        return;
      }
      if (results.some((result) => result === null)) {
        this.average.set(null);
        return;
      }
      const total = results.reduce((sum, result) => sum + toKopecks(result?.totalExpense ?? 0), 0);
      const average = Math.round(total / 3 / 100);
      this.average.set(average > 0 ? average : null);
    });
  }
}

function limitRule(value: number | null): Record<string, boolean> | null {
  if (value === null) {
    return { required: true };
  }
  if (value <= 0) {
    return { min: true };
  }
  if (value > LIMIT_MAX) {
    return { max: true };
  }
  return null;
}
