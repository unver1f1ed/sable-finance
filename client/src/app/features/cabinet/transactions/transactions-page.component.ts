import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  signal,
  untracked,
  effect,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, convertToParamMap } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { TransactionsApiService } from '../../../core/api/transactions-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { TransactionDto, TransactionList } from '../../../core/models/finance';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { CategoryIconComponent } from '../../../shared/ui/category-icon/category-icon.component';
import { ChipDirective } from '../../../shared/ui/chip/chip.directive';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { IconButtonDirective } from '../../../shared/ui/icon-button/icon-button.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { SegmentedComponent, SegmentedOption } from '../../../shared/ui/segmented/segmented.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/select/select.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { toIsoDate } from '../../../shared/util/date';
import { formatDate, formatDayHeading, formatMoney, formatMonth } from '../../../shared/util/format';
import { pluralize } from '../../../shared/util/plural';
import { ReferenceDataStore } from '../data/reference-data.store';
import { OnboardingCardComponent } from '../onboarding/onboarding-card.component';
import { MonthSwitcherComponent } from '../shared/month-switcher.component';
import { UpgradeDialogComponent } from '../shared/upgrade-dialog.component';
import { TransactionEditorService } from './transaction-editor.service';
import {
  ALL_TIME,
  TransactionFilters,
  TypeFilter,
  activeFilterCount,
  filtersFromParams,
  filtersToParams,
  patchFilters,
  toApiQuery,
} from './transaction-filters';

type ListRow = { kind: 'day'; key: string; label: string } | { kind: 'transaction'; key: string; transaction: TransactionDto };

interface FilterChip {
  key: string;
  label: string;
  patch: Partial<TransactionFilters>;
}

const SEARCH_DEBOUNCE_MS = 300;
// The table needs about this much room; narrower content areas get the card list.
const TABLE_MIN_WIDTH = 760;

@Component({
  selector: 'sb-transactions-page',
  imports: [
    FormsModule,
    NgTemplateOutlet,
    ReactiveFormsModule,
    RouterLink,
    ButtonDirective,
    CategoryIconComponent,
    ChipDirective,
    ConfirmDialogComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    FieldComponent,
    IconButtonDirective,
    IconComponent,
    ModalComponent,
    MonthSwitcherComponent,
    OnboardingCardComponent,
    PaginationComponent,
    SegmentedComponent,
    SelectComponent,
    SkeletonComponent,
    UpgradeDialogComponent,
  ],
  templateUrl: './transactions-page.component.html',
  host: { '(document:click)': 'openMenu.set(null)', '(document:keydown.escape)': 'openMenu.set(null)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TransactionsPageComponent {
  protected readonly store = inject(ReferenceDataStore);
  protected readonly auth = inject(AuthService);
  protected readonly editor = inject(TransactionEditorService);

  protected readonly typeOptions: SegmentedOption[] = [
    { value: 'all', label: 'Усі' },
    { value: 'Income', label: 'Доходи' },
    { value: 'Expense', label: 'Витрати' },
  ];
  protected readonly sortOptions: SelectOption[] = [
    { value: 'date_desc', label: 'Спочатку нові' },
    { value: 'date_asc', label: 'Спочатку старі' },
    { value: 'amount_desc', label: 'Сума: за спаданням' },
    { value: 'amount_asc', label: 'Сума: за зростанням' },
  ];
  protected readonly skeletonRows = Array.from({ length: 10 }, (_, index) => index);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly data = signal<TransactionList | null>(null);
  protected readonly busy = signal(false);
  protected readonly wide = signal(true);
  protected readonly sheetOpen = signal(false);
  protected readonly openMenu = signal<string | null>(null);
  protected readonly deleting = signal<TransactionDto | null>(null);
  protected readonly deleteBusy = signal(false);
  protected readonly exporting = signal(false);
  protected readonly upgradeOpen = signal(false);

  private readonly today = new Date();
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(TransactionsApiService);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly reloadTick = signal(0);

  protected readonly filters = computed(() => filtersFromParams(this.params(), this.today));
  protected readonly filterCount = computed(() => activeFilterCount(this.filters(), this.today));
  protected readonly isDateSort = computed(() => this.filters().sort.startsWith('date'));
  protected readonly accountOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Усі рахунки' },
    ...this.store.accounts().map((account) => ({ value: account.id, label: account.name })),
  ]);
  protected readonly categoryOptions = computed<SelectOption[]>(() => {
    const type = this.filters().type;
    const list = type === 'Income' ? this.store.incomeCategories() : type === 'Expense' ? this.store.expenseCategories() : this.store.categories();
    return [{ value: '', label: 'Усі категорії' }, ...list.map((category) => ({ value: category.id, label: category.name }))];
  });
  protected readonly difference = computed(() => {
    const list = this.data();
    return list ? Math.round((list.totalIncome - list.totalExpense) * 100) / 100 : 0;
  });
  protected readonly chips = computed<FilterChip[]>(() => {
    const filters = this.filters();
    const chips: FilterChip[] = [];
    if (filters.search) {
      chips.push({ key: 'search', label: `Пошук: ${filters.search}`, patch: { search: '' } });
    }
    if (filters.accountId) {
      const account = this.store.accounts().find((item) => item.id === filters.accountId);
      chips.push({ key: 'account', label: `Рахунок: ${account?.name ?? '–'}`, patch: { accountId: null } });
    }
    if (filters.categoryId) {
      const category = this.store.category(filters.categoryId);
      chips.push({ key: 'category', label: `Категорія: ${category?.name ?? '–'}`, patch: { categoryId: null } });
    }
    if (filters.type !== 'all') {
      chips.push({ key: 'type', label: filters.type === 'Income' ? 'Тип: доходи' : 'Тип: витрати', patch: { type: 'all' } });
    }
    if (filters.month !== this.filtersFromEmpty().month) {
      chips.push({
        key: 'month',
        label: filters.month === ALL_TIME ? 'Період: увесь час' : `Період: ${formatMonth(filters.month).toLowerCase()}`,
        patch: { month: this.filtersFromEmpty().month },
      });
    }
    return chips;
  });
  protected readonly subtitle = computed(() => {
    const list = this.data();
    if (!list) {
      return '';
    }
    if (list.total === 0 && this.filterCount() > 0) {
      return 'За обраними фільтрами нічого не знайдено';
    }
    const month = this.filters().month;
    const period = month === ALL_TIME ? 'увесь час' : formatMonth(month).toLowerCase();
    return `${list.total} ${pluralize(list.total, 'запис', 'записи', 'записів')} за ${period}`;
  });
  protected readonly rows = computed<ListRow[]>(() => {
    const list = this.data();
    if (!list) {
      return [];
    }
    const grouped = this.isDateSort();
    const rows: ListRow[] = [];
    let lastDay = '';
    for (const transaction of list.items) {
      if (grouped && transaction.occurredOn !== lastDay) {
        lastDay = transaction.occurredOn;
        rows.push({ kind: 'day', key: `day-${lastDay}`, label: formatDayHeading(lastDay, this.today) });
      }
      rows.push({ kind: 'transaction', key: transaction.id, transaction });
    }
    return rows;
  });
  protected readonly deleteMessage = computed(() => {
    const transaction = this.deleting();
    if (!transaction) {
      return '';
    }
    const sign = transaction.type === 'Expense' ? -transaction.amount : transaction.amount;
    return `«${transaction.description}», ${formatMoney(sign)} від ${formatDate(transaction.occurredOn)} буде видалено назавжди. Баланс рахунку «${transaction.account.name}» перерахується.`;
  });

  constructor() {
    toObservable(computed(() => ({ query: toApiQuery(this.filters()), tick: this.reloadTick() })))
      .pipe(
        switchMap(({ query }) => {
          this.busy.set(true);
          return this.api.list(query).pipe(
            map((list) => ({ list })),
            catchError(() => of({ list: null })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ list }) => {
        this.busy.set(false);
        if (list) {
          this.data.set(list);
          this.state.set('ready');
        } else {
          this.state.set(this.data() ? 'ready' : 'error');
        }
      });

    this.searchControl.valueChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        if (value.trim() !== this.filters().search) {
          this.update({ search: value.trim() }, true);
        }
      });

    effect(() => {
      const search = this.filters().search;
      untracked(() => {
        if (search !== this.searchControl.value.trim()) {
          this.searchControl.setValue(search, { emitEvent: false });
        }
      });
    });

    this.editor.changes$.pipe(takeUntilDestroyed()).subscribe((change) => this.afterChange(change === 'deleted'));

    afterNextRender(() => {
      const area = this.host.nativeElement.closest('.shell__content') ?? this.host.nativeElement;
      const observer = new ResizeObserver(([entry]) => this.wide.set(entry.contentRect.width >= TABLE_MIN_WIDTH));
      observer.observe(area);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected update(patch: Partial<TransactionFilters>, replace = false): void {
    const next = patchFilters(this.filters(), patch);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filtersToParams(next, this.today),
      queryParamsHandling: 'merge',
      replaceUrl: replace,
    });
  }

  protected changeType(value: string): void {
    const type = value as TypeFilter;
    const categoryId = this.filters().categoryId;
    const category = categoryId ? this.store.category(categoryId) : undefined;
    const keep = !category || type === 'all' || category.type === type;
    this.update({ type, categoryId: keep ? categoryId : null });
  }

  protected resetFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filtersToParams(filtersFromParams(convertToParamMap({}), this.today), this.today),
      queryParamsHandling: 'merge',
    });
  }

  protected retry(): void {
    this.state.set('loading');
    this.reloadTick.update((value) => value + 1);
    if (this.store.status() === 'error') {
      this.store.reload();
    }
  }

  protected toggleMenu(id: string, event: Event): void {
    event.stopPropagation();
    this.openMenu.update((current) => (current === id ? null : id));
  }

  protected edit(transaction: TransactionDto): void {
    this.openMenu.set(null);
    this.editor.edit(transaction);
  }

  protected askDelete(transaction: TransactionDto): void {
    this.openMenu.set(null);
    this.deleting.set(transaction);
  }

  protected confirmDelete(): void {
    const transaction = this.deleting();
    if (!transaction) {
      return;
    }
    this.deleteBusy.set(true);
    this.api.delete(transaction.id).subscribe({
      next: () => {
        this.deleteBusy.set(false);
        this.deleting.set(null);
        this.toast.success('Транзакцію видалено');
        this.store.reloadAccounts();
        this.afterChange(true);
      },
      error: () => this.deleteBusy.set(false),
    });
  }

  protected amountText(transaction: TransactionDto): string {
    return formatMoney(transaction.type === 'Expense' ? -transaction.amount : transaction.amount, { sign: true });
  }

  protected money(value: number, sign = false): string {
    return formatMoney(value, { sign });
  }

  protected exportCsv(): void {
    if (this.auth.planCode() !== 'plus') {
      this.upgradeOpen.set(true);
      return;
    }
    this.exporting.set(true);
    this.api.exportCsv(toApiQuery(this.filters())).subscribe({
      next: (response) => {
        this.exporting.set(false);
        this.save(response);
      },
      error: (error: unknown) => {
        this.exporting.set(false);
        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.upgradeOpen.set(true);
        }
      },
    });
  }

  private afterChange(deleted: boolean): void {
    const list = this.data();
    const page = this.filters().page;
    if (deleted && list && list.items.length === 1 && page > 1) {
      this.update({ page: page - 1 });
    } else {
      this.reloadTick.update((value) => value + 1);
    }
  }

  private filtersFromEmpty(): TransactionFilters {
    return filtersFromParams(convertToParamMap({}), this.today);
  }

  private save(response: HttpResponse<Blob>): void {
    const blob = response.body;
    if (!blob) {
      return;
    }
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
    const plain = /filename="?([^";]+)"?/i.exec(disposition)?.[1];
    const name = encoded ? decodeURIComponent(encoded) : (plain ?? `sable-transactions-${toIsoDate(this.today)}.csv`);
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }
}

