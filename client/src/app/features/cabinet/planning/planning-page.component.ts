import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { BudgetsApiService } from '../../../core/api/budgets-api.service';
import { GoalsApiService } from '../../../core/api/goals-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { BudgetDto, BudgetSummary, GoalDto } from '../../../core/models/finance';
import { PLAN_LIMITS } from '../../../core/models/plan-limits';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { CategoryIconComponent } from '../../../shared/ui/category-icon/category-icon.component';
import { ChipDirective } from '../../../shared/ui/chip/chip.directive';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { IconButtonDirective } from '../../../shared/ui/icon-button/icon-button.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ProgressComponent } from '../../../shared/ui/progress/progress.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { currentMonth, isValidMonth } from '../../../shared/util/date';
import { formatMoney, formatMonth } from '../../../shared/util/format';
import { ReferenceDataStore } from '../data/reference-data.store';
import { MonthSwitcherComponent } from '../shared/month-switcher.component';
import { UpgradeDialogComponent } from '../shared/upgrade-dialog.component';
import { BudgetModalComponent } from './budget-modal.component';
import { ContributionModalComponent } from './contribution-modal.component';
import { GoalModalComponent } from './goal-modal.component';
import { budgetState, daysLeftText, goalDeadlineLine, toKopecks, fromKopecks } from './planning-logic';

interface Block<T> {
  status: 'loading' | 'ready' | 'error';
  data: T | null;
}

type BudgetFilter = 'all' | 'over' | 'within';
type Confirmation =
  | { kind: 'budget'; budget: BudgetDto }
  | { kind: 'goal-delete'; goal: GoalDto }
  | { kind: 'goal-archive'; goal: GoalDto };

const LOADING: Block<never> = { status: 'loading', data: null };

function load<T>(source: Observable<T>): Observable<Block<T>> {
  return source.pipe(
    map((data): Block<T> => ({ status: 'ready', data })),
    catchError(() => of<Block<T>>({ status: 'error', data: null })),
  );
}

@Component({
  selector: 'sb-planning-page',
  imports: [
    RouterLink,
    BadgeComponent,
    BudgetModalComponent,
    ButtonDirective,
    CategoryIconComponent,
    ChipDirective,
    ConfirmDialogComponent,
    ContributionModalComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    GoalModalComponent,
    IconButtonDirective,
    IconComponent,
    MonthSwitcherComponent,
    ProgressComponent,
    SkeletonComponent,
    UpgradeDialogComponent,
  ],
  templateUrl: './planning-page.component.html',
  host: { '(document:click)': 'openMenu.set(null)', '(document:keydown.escape)': 'openMenu.set(null)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PlanningPageComponent {
  protected readonly store = inject(ReferenceDataStore);
  protected readonly budgets = signal<Block<BudgetSummary>>(LOADING);
  protected readonly goals = signal<Block<GoalDto[]>>(LOADING);
  protected readonly openMenu = signal<string | null>(null);
  protected readonly budgetModal = signal<{ budget: BudgetDto | null } | null>(null);
  protected readonly goalModal = signal<{ goal: GoalDto | null } | null>(null);
  protected readonly contributing = signal<GoalDto | null>(null);
  protected readonly confirmation = signal<Confirmation | null>(null);
  protected readonly confirmBusy = signal(false);
  protected readonly upgradeMessage = signal<string | null>(null);
  protected readonly skeletons = [0, 1, 2];

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly budgetsApi = inject(BudgetsApiService);
  private readonly goalsApi = inject(GoalsApiService);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly budgetTick = signal(0);
  private readonly goalTick = signal(0);
  private readonly now = new Date();

  protected readonly month = computed(() => {
    const value = this.params().get('month');
    return value && isValidMonth(value) ? value : currentMonth(this.now);
  });
  protected readonly monthName = computed(() => formatMonth(this.month()).split(' ')[0].toLowerCase());
  protected readonly pastMonth = computed(() => this.month() < currentMonth(this.now));
  protected readonly filter = computed<BudgetFilter>(() => {
    const value = this.params().get('budgets');
    return value === 'over' || value === 'within' ? value : 'all';
  });
  protected readonly showArchived = computed(() => this.params().get('archived') === '1');
  protected readonly isStart = computed(() => this.auth.planCode() !== 'plus');

  protected readonly items = computed(() => this.budgets().data?.items ?? []);
  protected readonly overCount = computed(() => this.items().filter((item) => item.spent > item.limitAmount).length);
  protected readonly withinCount = computed(() => this.items().length - this.overCount());
  protected readonly visibleBudgets = computed(() => {
    const filter = this.filter();
    return this.items().filter((item) => (filter === 'all' ? true : filter === 'over' ? item.spent > item.limitAmount : item.spent <= item.limitAmount));
  });
  protected readonly usedCategoryIds = computed(() => this.items().map((item) => item.category.id));
  protected readonly budgetLimitReached = computed(() => this.isStart() && this.items().length >= (PLAN_LIMITS.start.budgets ?? 0));
  protected readonly summary = computed(() => {
    const data = this.budgets().data;
    if (!data) {
      return null;
    }
    const percent = data.totalLimit > 0 ? Math.round((toKopecks(data.totalSpent) / toKopecks(data.totalLimit)) * 100) : 0;
    const diff = toKopecks(data.totalLimit) - toKopecks(data.totalSpent);
    return {
      data,
      percent,
      barPercent: Math.min(100, percent),
      over: diff < 0,
      remainder: diff < 0 ? `Перевищено на ${formatMoney(fromKopecks(-diff))}` : `Залишок ${formatMoney(fromKopecks(diff))}`,
      days: daysLeftText(data.daysLeft, this.pastMonth()),
    };
  });
  protected readonly activeGoalCount = computed(() => (this.goals().data ?? []).filter((goal) => !goal.isArchived && !goal.isAchieved).length);
  protected readonly goalLimitReached = computed(() => this.isStart() && this.activeGoalCount() >= (PLAN_LIMITS.start.goals ?? 0));
  protected readonly savedTotal = computed(() =>
    fromKopecks((this.goals().data ?? []).filter((goal) => !goal.isArchived).reduce((sum, goal) => sum + toKopecks(goal.currentAmount), 0)),
  );
  protected readonly confirmTitle = computed(() => {
    const value = this.confirmation();
    return value?.kind === 'budget' ? 'Видалити бюджет?' : value?.kind === 'goal-archive' ? 'Архівувати ціль?' : 'Видалити ціль?';
  });
  protected readonly confirmMessage = computed(() => {
    const value = this.confirmation();
    if (!value) {
      return '';
    }
    if (value.kind === 'budget') {
      return `Бюджет для «${value.budget.category.name}» буде видалено. Транзакції залишаться.`;
    }
    if (value.kind === 'goal-archive') {
      return `Ціль «${value.goal.name}» перейде в архів. Внески в неї стануть недоступними, історія збережеться.`;
    }
    return `Ціль «${value.goal.name}» буде видалено. Транзакції внесків залишаться в історії без прив’язки до цілі.`;
  });
  protected readonly confirmLabel = computed(() => (this.confirmation()?.kind === 'goal-archive' ? 'Архівувати' : 'Видалити'));

  constructor() {
    toObservable(computed(() => ({ month: this.month(), tick: this.budgetTick() })))
      .pipe(
        switchMap(({ month }) => load(this.budgetsApi.summary(month))),
        takeUntilDestroyed(),
      )
      .subscribe((block) => this.budgets.set(block));
    toObservable(computed(() => ({ archived: this.showArchived(), tick: this.goalTick() })))
      .pipe(
        switchMap(({ archived }) => load(this.goalsApi.list(archived))),
        takeUntilDestroyed(),
      )
      .subscribe((block) => this.goals.set(block));
    let known: string | null = null;
    effect(() => {
      const plan = this.auth.planCode();
      untracked(() => {
        if (known !== null && plan !== known) {
          this.reloadAll();
        }
      });
      known = plan;
    });
  }

  protected reloadBudgets(): void {
    this.budgetTick.update((value) => value + 1);
  }

  protected reloadGoals(): void {
    this.goalTick.update((value) => value + 1);
  }

  protected reloadAll(): void {
    this.reloadBudgets();
    this.reloadGoals();
  }

  protected retryBudgets(): void {
    this.budgets.set(LOADING);
    this.reloadBudgets();
  }

  protected retryGoals(): void {
    this.goals.set(LOADING);
    this.reloadGoals();
  }

  protected setQuery(values: Record<string, string | null>): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: values, queryParamsHandling: 'merge' });
  }

  protected changeMonth(month: string): void {
    this.setQuery({ month: month === currentMonth(this.now) ? null : month });
  }

  protected toggleMenu(id: string, event: Event): void {
    event.stopPropagation();
    this.openMenu.update((current) => (current === id ? null : id));
  }

  protected newBudget(): void {
    this.openMenu.set(null);
    if (this.budgetLimitReached()) {
      this.upgradeMessage.set('У тарифі Старт доступно 5 бюджетів. Перейдіть на Плюс, щоб створювати більше.');
      return;
    }
    this.budgetModal.set({ budget: null });
  }

  protected editBudget(budget: BudgetDto): void {
    this.openMenu.set(null);
    this.budgetModal.set({ budget });
  }

  protected askDeleteBudget(budget: BudgetDto): void {
    this.openMenu.set(null);
    this.confirmation.set({ kind: 'budget', budget });
  }

  protected newGoal(): void {
    this.openMenu.set(null);
    if (this.goalLimitReached()) {
      this.upgradeMessage.set('Перейдіть на Плюс, щоб мати більше однієї активної цілі');
      return;
    }
    this.goalModal.set({ goal: null });
  }

  protected editGoal(goal: GoalDto): void {
    this.openMenu.set(null);
    this.goalModal.set({ goal });
  }

  protected askArchive(goal: GoalDto): void {
    this.openMenu.set(null);
    this.confirmation.set({ kind: 'goal-archive', goal });
  }

  protected askDeleteGoal(goal: GoalDto): void {
    this.openMenu.set(null);
    this.confirmation.set({ kind: 'goal-delete', goal });
  }

  protected showUpgrade(message: string): void {
    this.budgetModal.set(null);
    this.goalModal.set(null);
    this.upgradeMessage.set(message);
  }

  protected onBudgetSaved(): void {
    this.budgetModal.set(null);
    this.reloadBudgets();
  }

  protected onGoalSaved(): void {
    this.goalModal.set(null);
    this.reloadGoals();
  }

  protected onContributed(): void {
    this.contributing.set(null);
    this.reloadGoals();
    this.store.reloadAccounts();
    if (this.month() === currentMonth(this.now)) {
      this.reloadBudgets();
    }
  }

  protected runConfirmation(): void {
    const value = this.confirmation();
    if (!value) {
      return;
    }
    this.confirmBusy.set(true);
    const done = (message: string, reload: () => void): void => {
      this.confirmBusy.set(false);
      this.confirmation.set(null);
      this.toast.success(message);
      reload();
    };
    const failed = (): void => this.confirmBusy.set(false);
    if (value.kind === 'budget') {
      this.budgetsApi.delete(value.budget.id).subscribe({ next: () => done('Бюджет видалено', () => this.reloadBudgets()), error: failed });
    } else if (value.kind === 'goal-archive') {
      this.goalsApi.archive(value.goal.id).subscribe({ next: () => done('Ціль переведено в архів', () => this.reloadGoals()), error: failed });
    } else {
      this.goalsApi.delete(value.goal.id).subscribe({ next: () => done('Ціль видалено', () => this.reloadGoals()), error: failed });
    }
  }

  protected state(budget: BudgetDto) {
    return budgetState(budget.spent, budget.limitAmount);
  }

  protected money(value: number): string {
    return formatMoney(value);
  }

  protected deadline(goal: GoalDto) {
    return goalDeadlineLine(goal, this.now);
  }

  protected goalPercent(goal: GoalDto): number {
    return goal.targetAmount > 0 ? Math.round((toKopecks(goal.currentAmount) / toKopecks(goal.targetAmount)) * 100) : 0;
  }
}
