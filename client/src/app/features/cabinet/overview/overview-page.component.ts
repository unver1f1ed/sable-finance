import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { BudgetsApiService } from '../../../core/api/budgets-api.service';
import { DashboardApiService } from '../../../core/api/dashboard-api.service';
import { GoalsApiService } from '../../../core/api/goals-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { BudgetSummary, DashboardDto, GoalDto, TransactionDto } from '../../../core/models/finance';
import { BadgeComponent, BadgeTone } from '../../../shared/ui/badge/badge.component';
import { BarChartComponent, BarChartDatum } from '../../../shared/ui/charts/bar-chart.component';
import { DonutChartComponent, DonutSegment } from '../../../shared/ui/charts/donut-chart.component';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { CategoryIconComponent } from '../../../shared/ui/category-icon/category-icon.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ProgressComponent } from '../../../shared/ui/progress/progress.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { currentMonth, isValidMonth, shiftMonth } from '../../../shared/util/date';
import {
  formatMoney,
  formatMonth,
  formatPercent,
  formatPercentDelta,
  formatPointsDelta,
  greetingFor,
  monthGenitive,
  monthShort,
} from '../../../shared/util/format';
import { pluralize } from '../../../shared/util/plural';
import { ReferenceDataStore } from '../data/reference-data.store';
import { OnboardingCardComponent } from '../onboarding/onboarding-card.component';
import { MonthSwitcherComponent } from '../shared/month-switcher.component';
import { TransactionEditorService } from '../transactions/transaction-editor.service';

interface Block<T> {
  status: 'loading' | 'ready' | 'error';
  data: T | null;
}

interface StatCard {
  key: string;
  label: string;
  value: string;
  delta: string;
  tone: BadgeTone;
  suffix: string;
  big: boolean;
}

const OTHER_CATEGORY_ID = '00000000-0000-0000-0000-000000000000';
const LOADING: Block<never> = { status: 'loading', data: null };

function load<T>(source: Observable<T>): Observable<Block<T>> {
  return source.pipe(
    map((data): Block<T> => ({ status: 'ready', data })),
    catchError(() => of<Block<T>>({ status: 'error', data: null })),
  );
}

@Component({
  selector: 'sb-overview-page',
  imports: [
    RouterLink,
    BadgeComponent,
    BarChartComponent,
    ButtonDirective,
    CategoryIconComponent,
    DonutChartComponent,
    ErrorStateComponent,
    IconComponent,
    MonthSwitcherComponent,
    OnboardingCardComponent,
    ProgressComponent,
    SkeletonComponent,
  ],
  templateUrl: './overview-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class OverviewPageComponent {
  protected readonly store = inject(ReferenceDataStore);
  protected readonly auth = inject(AuthService);
  protected readonly editor = inject(TransactionEditorService);

  protected readonly dashboard = signal<Block<DashboardDto>>(LOADING);
  protected readonly goals = signal<Block<GoalDto[]>>(LOADING);
  protected readonly budgets = signal<Block<BudgetSummary>>(LOADING);
  protected readonly skeletons = [0, 1, 2, 3];

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly goalsApi = inject(GoalsApiService);
  private readonly budgetsApi = inject(BudgetsApiService);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly tick = signal(0);
  private readonly now = new Date();

  protected readonly month = computed(() => {
    const value = this.params().get('month');
    return value && isValidMonth(value) ? value : currentMonth(this.now);
  });
  protected readonly greeting = computed(() => `${greetingFor(this.now.getHours())}, ${this.auth.user()?.firstName ?? ''}`.replace(/, $/, ''));
  protected readonly subtitle = computed(() => `Ось як виглядають ваші фінанси за ${formatMonth(this.month()).toLowerCase()}`);
  protected readonly previousMonthName = computed(() => monthGenitive(shiftMonth(this.month(), -1)));

  protected readonly stats = computed<StatCard[]>(() => {
    const data = this.dashboard().data;
    if (!data) {
      return [];
    }
    const previous = data.previous;
    const suffix = `до ${this.previousMonthName()}`;
    const tone = (current: number, before: number, badWhenUp = false): BadgeTone => {
      if (!before || current === before) {
        return 'grey';
      }
      const up = current > before;
      return up === !badWhenUp ? 'teal' : badWhenUp ? 'amber' : 'red';
    };
    return [
      {
        key: 'balance',
        label: 'Загальний баланс',
        value: formatMoney(data.totalBalance),
        delta: formatPercentDelta(data.totalBalance, previous.totalBalance),
        tone: tone(data.totalBalance, previous.totalBalance),
        suffix,
        big: true,
      },
      {
        key: 'income',
        label: 'Доходи',
        value: formatMoney(data.income, { sign: true }),
        delta: formatPercentDelta(data.income, previous.income),
        tone: tone(data.income, previous.income),
        suffix,
        big: false,
      },
      {
        key: 'expense',
        label: 'Витрати',
        value: formatMoney(-data.expense),
        delta: formatPercentDelta(data.expense, previous.expense),
        tone: tone(data.expense, previous.expense, true),
        suffix,
        big: false,
      },
      {
        key: 'saved',
        label: 'Заощаджено',
        value: formatPercent(data.savedPercent),
        delta: formatPointsDelta(data.savedPercent, previous.savedPercent),
        tone: tone(data.savedPercent, previous.savedPercent),
        suffix,
        big: false,
      },
    ];
  });
  protected readonly bars = computed<BarChartDatum[]>(() =>
    (this.dashboard().data?.monthly ?? []).map((item) => ({
      label: monthShort(item.month),
      income: item.income,
      expense: item.expense,
      current: item.month === this.month(),
    })),
  );
  protected readonly segments = computed<DonutSegment[]>(() =>
    (this.dashboard().data?.byCategory ?? []).map((item) => ({
      id: item.categoryId,
      label: item.name,
      value: item.amount,
      color: item.color,
      selectable: item.categoryId !== OTHER_CATEGORY_ID,
    })),
  );
  protected readonly activeGoals = computed(() =>
    (this.goals().data ?? []).filter((goal) => !goal.isArchived && !goal.isAchieved).slice(0, 2),
  );
  protected readonly budgetItems = computed(() => (this.budgets().data?.items ?? []).slice(0, 3));
  protected readonly overLimit = computed(() => (this.budgets().data?.items ?? []).filter((item) => item.spent > item.limitAmount).length);
  protected readonly overLimitText = computed(() => `${this.overLimit()} понад ліміт`);

  constructor() {
    const request = toObservable(computed(() => ({ month: this.month(), tick: this.tick() })));
    request
      .pipe(
        switchMap(({ month }) => load(this.dashboardApi.get(month))),
        takeUntilDestroyed(),
      )
      .subscribe((block) => this.dashboard.set(block));
    request
      .pipe(
        switchMap(() => load(this.goalsApi.list())),
        takeUntilDestroyed(),
      )
      .subscribe((block) => this.goals.set(block));
    request
      .pipe(
        switchMap(({ month }) => load(this.budgetsApi.summary(month))),
        takeUntilDestroyed(),
      )
      .subscribe((block) => this.budgets.set(block));
    this.editor.changes$.pipe(takeUntilDestroyed()).subscribe(() => this.reload());
    let knownAccounts = -1;
    effect(() => {
      const count = this.store.accounts().length;
      if (knownAccounts !== -1 && count !== knownAccounts) {
        this.reload();
      }
      knownAccounts = count;
    });
  }

  protected reload(): void {
    this.tick.update((value) => value + 1);
  }

  protected retry(): void {
    this.dashboard.set(LOADING);
    this.goals.set(LOADING);
    this.budgets.set(LOADING);
    this.reload();
  }

  protected changeMonth(month: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { month: month === currentMonth(this.now) ? null : month },
      queryParamsHandling: 'merge',
    });
  }

  protected openCategory(segment: DonutSegment): void {
    void this.router.navigate(['/app/transactions'], {
      queryParams: { type: 'Expense', month: this.month(), categoryId: segment.id },
    });
  }

  protected edit(transaction: TransactionDto): void {
    this.editor.edit(transaction);
  }

  protected money(value: number, sign = false): string {
    return formatMoney(value, { sign });
  }

  protected amountText(transaction: TransactionDto): string {
    return formatMoney(transaction.type === 'Expense' ? -transaction.amount : transaction.amount, { sign: true });
  }

  protected percent(current: number, target: number): number {
    return target > 0 ? Math.round((current / target) * 100) : 0;
  }

  protected budgetPercent(spent: number, limit: number): number {
    return limit > 0 ? (spent / limit) * 100 : 0;
  }

  protected pluralBudgets(): string {
    return pluralize(this.overLimit(), 'бюджет', 'бюджети', 'бюджетів');
  }
}
