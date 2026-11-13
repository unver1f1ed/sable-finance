import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { map, startWith } from 'rxjs';
import { GoalsApiService } from '../../../core/api/goals-api.service';
import { TransactionsApiService } from '../../../core/api/transactions-api.service';
import { applyServerErrors } from '../../../core/forms/form-errors';
import { GoalDto, TransactionDto, TransactionInput, TransactionType } from '../../../core/models/finance';
import { AmountFieldComponent } from '../../../shared/ui/amount-field/amount-field.component';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SegmentedComponent, SegmentedOption } from '../../../shared/ui/segmented/segmented.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/select/select.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { formatDate, formatMoney } from '../../../shared/util/format';
import { toIsoDate } from '../../../shared/util/date';
import { ReferenceDataStore } from '../data/reference-data.store';
import { TransactionEditorService } from './transaction-editor.service';
import {
  MIN_DATE,
  TransactionField,
  createTransactionForm,
  resetOnTypeChange,
  tomorrowIso,
  transactionFieldError,
} from './transaction-form';

const FIELD_ORDER: TransactionField[] = ['amount', 'description', 'categoryId', 'accountId', 'occurredOn', 'note'];

@Component({
  selector: 'sb-transaction-modal',
  imports: [
    ReactiveFormsModule,
    AmountFieldComponent,
    ButtonDirective,
    ConfirmDialogComponent,
    FieldComponent,
    IconComponent,
    ModalComponent,
    SegmentedComponent,
    SelectComponent,
  ],
  templateUrl: './transaction-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TransactionModalComponent {
  protected readonly editor = inject(TransactionEditorService);
  protected readonly store = inject(ReferenceDataStore);

  protected readonly typeOptions: SegmentedOption[] = [
    { value: 'Expense', label: 'Витрата' },
    { value: 'Income', label: 'Дохід' },
  ];
  protected readonly form: FormGroup = createTransactionForm();
  protected readonly minDate = MIN_DATE;
  protected readonly maxDate = tomorrowIso();
  protected readonly sending = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly goals = signal<GoalDto[] | null>(null);
  protected readonly isOpen = computed(() => this.editor.request() !== null);
  protected readonly editing = computed(() => this.editor.request()?.transaction ?? null);
  protected readonly title = computed(() => (this.editing() ? 'Редагування транзакції' : 'Нова транзакція'));

  protected readonly type = toSignal(
    this.form.controls['type'].valueChanges.pipe(startWith('Expense' as TransactionType)),
    { initialValue: 'Expense' as TransactionType },
  );
  protected readonly categoryId = toSignal(this.form.controls['categoryId'].valueChanges.pipe(startWith('')), {
    initialValue: '',
  });
  protected readonly noteLength = toSignal(
    this.form.controls['note'].valueChanges.pipe(
      startWith(''),
      map((value: string) => value.length),
    ),
    { initialValue: 0 },
  );
  protected readonly categoryOptions = computed<SelectOption[]>(() =>
    (this.type() === 'Income' ? this.store.incomeCategories() : this.store.expenseCategories()).map((category) => ({
      value: category.id,
      label: category.name,
    })),
  );
  protected readonly accountOptions = computed<SelectOption[]>(() =>
    this.store.accounts().map((account) => ({ value: account.id, label: account.name })),
  );
  protected readonly showGoal = computed(
    () => this.goals() !== null && !!this.store.category(this.categoryId())?.isGoalContribution,
  );
  protected readonly goalOptions = computed<SelectOption[]>(() =>
    (this.goals() ?? [])
      .filter((goal) => !goal.isArchived && !goal.isAchieved)
      .map((goal) => ({ value: goal.id, label: goal.name })),
  );
  protected readonly deleteMessage = computed(() => {
    const transaction = this.editing();
    if (!transaction) {
      return '';
    }
    const sign = transaction.type === 'Expense' ? -transaction.amount : transaction.amount;
    return `«${transaction.description}», ${formatMoney(sign)} від ${formatDate(transaction.occurredOn)} буде видалено назавжди. Баланс рахунку «${transaction.account.name}» перерахується.`;
  });

  private readonly api = inject(TransactionsApiService);
  private readonly goalsApi = inject(GoalsApiService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly submitted = signal(false);
  private goalsRequested = false;
  private preparing = false;

  constructor() {
    this.form.controls['type'].valueChanges.subscribe(() => {
      if (!this.preparing) {
        resetOnTypeChange(this.form);
      }
    });
    effect(() => {
      const request = this.editor.request();
      if (!request) {
        return;
      }
      this.prepare(request.transaction);
    });
    effect(() => {
      if (this.isOpen() && this.store.category(this.categoryId())?.isGoalContribution && !this.goalsRequested) {
        this.goalsRequested = true;
        this.goalsApi.list().subscribe({
          next: (goals) => this.goals.set(goals),
          error: () => this.goals.set(null),
        });
      }
    });
  }

  protected error(name: TransactionField): string | undefined {
    const control = this.form.controls[name];
    const message = transactionFieldError(this.form, name);
    if (!message) {
      return undefined;
    }
    return control.touched || this.submitted() || control.errors?.['server'] ? message : undefined;
  }

  protected close(): void {
    this.confirmOpen.set(false);
    this.editor.close();
  }

  protected submit(): void {
    this.submitted.set(true);
    this.form.controls['description'].setValue((this.form.controls['description'].value as string).trim(), {
      emitEvent: false,
    });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }
    const raw = this.form.getRawValue() as {
      type: TransactionType;
      amount: number;
      description: string;
      categoryId: string;
      accountId: string;
      occurredOn: string;
      goalId: string;
      note: string;
    };
    const input: TransactionInput = {
      type: raw.type,
      amount: raw.amount,
      occurredOn: raw.occurredOn,
      description: raw.description,
      note: raw.note.trim() || null,
      accountId: raw.accountId,
      categoryId: raw.categoryId,
      goalId: this.showGoal() && raw.goalId ? raw.goalId : null,
    };
    const existing = this.editing();
    this.sending.set(true);
    const request = existing ? this.api.update(existing.id, input) : this.api.create(input);
    request.subscribe({
      next: () => {
        this.sending.set(false);
        this.toast.success(existing ? 'Зміни збережено' : 'Транзакцію додано');
        this.finish(existing ? 'updated' : 'created');
      },
      error: (error: unknown) => {
        this.sending.set(false);
        if (applyServerErrors(this.form, error)) {
          this.focusFirstInvalid();
        }
      },
    });
  }

  protected remove(): void {
    const existing = this.editing();
    if (!existing) {
      return;
    }
    this.sending.set(true);
    this.api.delete(existing.id).subscribe({
      next: () => {
        this.sending.set(false);
        this.confirmOpen.set(false);
        this.toast.success('Транзакцію видалено');
        this.finish('deleted');
      },
      error: () => this.sending.set(false),
    });
  }

  private finish(change: 'created' | 'updated' | 'deleted'): void {
    this.editor.close();
    this.editor.notify(change);
    this.store.reloadAccounts();
  }

  private prepare(transaction: TransactionDto | null): void {
    this.preparing = true;
    this.form.enable({ emitEvent: false });
    this.form.reset({
      type: transaction?.type ?? 'Expense',
      amount: transaction?.amount ?? null,
      description: transaction?.description ?? '',
      categoryId: transaction?.category.id ?? '',
      accountId: transaction?.account.id ?? this.store.defaultAccount()?.id ?? '',
      occurredOn: transaction?.occurredOn ?? toIsoDate(new Date()),
      goalId: transaction?.goal?.id ?? '',
      note: transaction?.note ?? '',
    });
    this.preparing = false;
    this.submitted.set(false);
    this.sending.set(false);
    this.confirmOpen.set(false);
  }

  private focusFirstInvalid(): void {
    for (const name of FIELD_ORDER) {
      if (!this.error(name)) {
        continue;
      }
      const element = this.host.nativeElement.querySelector<HTMLElement>(
        name === 'amount' ? '.amount__input' : `[formControlName="${name}"]`,
      );
      const target = element?.matches('input, select, textarea') ? element : element?.querySelector<HTMLElement>('input, select, textarea');
      target?.focus();
      return;
    }
  }
}
