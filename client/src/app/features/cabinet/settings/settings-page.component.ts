import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { AccountsApiService } from '../../../core/api/accounts-api.service';
import { AuthApiService } from '../../../core/api/auth-api.service';
import { BudgetsApiService } from '../../../core/api/budgets-api.service';
import { CategoriesApiService } from '../../../core/api/categories-api.service';
import { GoalsApiService } from '../../../core/api/goals-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { applyServerErrors, serverError } from '../../../core/forms/form-errors';
import { isApiError } from '../../../core/models/api-error';
import { AccountDto, CategoryDto } from '../../../core/models/finance';
import { PLAN_LIMITS } from '../../../core/models/plan-limits';
import { PlanCode } from '../../../core/models/public-content';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { CategoryIconComponent } from '../../../shared/ui/category-icon/category-icon.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { IconButtonDirective } from '../../../shared/ui/icon-button/icon-button.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ProgressComponent } from '../../../shared/ui/progress/progress.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { currentMonth } from '../../../shared/util/date';
import { formatMoney, formatPrice } from '../../../shared/util/format';
import { PublicContentService } from '../../public/data/public-content.service';
import { EMAIL_MESSAGE, EMAIL_PATTERN, REQUIRED_MESSAGE } from '../../auth/register-form';
import { AccountModalComponent } from '../accounts/account-modal.component';
import { ReferenceDataStore } from '../data/reference-data.store';
import { UpgradeDialogComponent } from '../shared/upgrade-dialog.component';
import { CategoryModalComponent } from './category-modal.component';
import { DeleteAccountModalComponent } from './delete-account-modal.component';
import { PasswordModalComponent } from './password-modal.component';
import { PlanUsage, accountTypeLabel, memberSince, planSummary, usageRows } from './settings-logic';

type Confirmation =
  | { kind: 'account'; account: AccountDto }
  | { kind: 'category'; category: CategoryDto }
  | { kind: 'plan'; plan: PlanCode };

type ProfileField = 'firstName' | 'lastName' | 'email';

const FALLBACK_PLUS_PRICE = 103;
const SECTIONS = [
  { id: 'profile', label: 'Профіль' },
  { id: 'plan', label: 'Тариф' },
  { id: 'accounts', label: 'Рахунки' },
  { id: 'categories', label: 'Категорії' },
  { id: 'security', label: 'Безпека' },
];

@Component({
  selector: 'sb-settings-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AccountModalComponent,
    AvatarComponent,
    BadgeComponent,
    ButtonDirective,
    CategoryIconComponent,
    CategoryModalComponent,
    ConfirmDialogComponent,
    DeleteAccountModalComponent,
    FieldComponent,
    IconButtonDirective,
    IconComponent,
    PasswordModalComponent,
    ProgressComponent,
    SkeletonComponent,
    UpgradeDialogComponent,
  ],
  templateUrl: './settings-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SettingsPageComponent {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(ReferenceDataStore);
  protected readonly sections = SECTIONS;
  protected readonly skeletons = [0, 1, 2];
  protected readonly profileForm = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(EMAIL_PATTERN), Validators.maxLength(120)] }),
  });
  protected readonly profileSaving = signal(false);
  protected readonly usage = signal<{ budgets: number; goals: number } | null>(null);
  protected readonly plans = inject(PublicContentService).plans();
  protected readonly planBusy = signal(false);
  protected readonly accountModal = signal<{ account: AccountDto | null } | null>(null);
  protected readonly categoryModal = signal<{ category: CategoryDto | null } | null>(null);
  protected readonly passwordOpen = signal(false);
  protected readonly deleteOpen = signal(false);
  protected readonly confirmation = signal<Confirmation | null>(null);
  protected readonly confirmBusy = signal(false);
  protected readonly upgradeMessage = signal<string | null>(null);

  private readonly authApi = inject(AuthApiService);
  private readonly budgetsApi = inject(BudgetsApiService);
  private readonly goalsApi = inject(GoalsApiService);
  private readonly accountsApi = inject(AccountsApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly toast = inject(ToastService);
  private readonly submitted = signal(false);
  private readonly profileValues = toSignal(this.profileForm.valueChanges, { initialValue: this.profileForm.getRawValue() });

  protected readonly user = this.auth.user;
  protected readonly fullName = computed(() => {
    const user = this.user();
    return user ? `${user.firstName} ${user.lastName}`.trim() : '';
  });
  protected readonly since = computed(() => memberSince(this.user()?.createdAt ?? ''));
  protected readonly profileChanged = computed(() => {
    const user = this.user();
    const values = this.profileValues();
    return (
      user !== null &&
      (values.firstName !== user.firstName || values.lastName !== user.lastName || values.email !== user.email)
    );
  });

  protected readonly planCode = computed<PlanCode>(() => (this.auth.planCode() === 'plus' ? 'plus' : 'start'));
  protected readonly planName = computed(() => (this.planCode() === 'plus' ? 'Плюс' : 'Старт'));
  protected readonly otherPlan = computed<PlanCode>(() => (this.planCode() === 'plus' ? 'start' : 'plus'));
  protected readonly plusPrice = computed(() => this.plans().plans.find((plan) => plan.code === 'plus')?.priceYearlyPerMonth ?? FALLBACK_PLUS_PRICE);
  protected readonly planUsage = computed<PlanUsage | null>(() => {
    const usage = this.usage();
    return usage ? { accounts: this.store.accounts().length, budgets: usage.budgets, goals: usage.goals } : null;
  });
  protected readonly rows = computed(() => {
    const usage = this.planUsage();
    return usage ? usageRows(this.planCode(), usage) : [];
  });
  protected readonly summaryText = computed(() => {
    const usage = this.planUsage();
    return usage ? planSummary(this.planCode(), usage) : '';
  });

  protected readonly accountLimitReached = computed(() => {
    const limit = PLAN_LIMITS[this.planCode()].accounts;
    return limit !== null && this.store.accounts().length >= limit;
  });
  protected readonly expenseCategories = computed(() => this.store.expenseCategories());
  protected readonly incomeCategories = computed(() => this.store.incomeCategories());

  protected readonly confirmTitle = computed(() => {
    const value = this.confirmation();
    if (value?.kind === 'account') {
      return 'Видалити рахунок?';
    }
    if (value?.kind === 'category') {
      return 'Видалити категорію?';
    }
    return value?.plan === 'plus' ? 'Перейти на тариф Плюс?' : 'Повернутися на тариф Старт?';
  });
  protected readonly confirmMessage = computed(() => {
    const value = this.confirmation();
    if (value?.kind === 'account') {
      return `Рахунок «${value.account.name}» буде видалено разом з усіма його транзакціями.`;
    }
    if (value?.kind === 'category') {
      return `Категорію «${value.category.name}» буде видалено.`;
    }
    return value?.plan === 'plus'
      ? 'Оплата в навчальному проєкті не справжня: тариф зміниться одразу.'
      : 'Наявні дані збережуться, але додавати рахунки, бюджети й цілі понад ліміти тарифу Старт буде не можна, а експорт у CSV вимкнеться.';
  });
  protected readonly confirmLabel = computed(() => {
    const value = this.confirmation();
    return value?.kind === 'plan' ? (value.plan === 'plus' ? 'Перейти на Плюс' : 'Повернутися на Старт') : 'Видалити';
  });

  constructor() {
    effect(() => {
      const user = this.user();
      if (user) {
        this.profileForm.reset({ firstName: user.firstName, lastName: user.lastName, email: user.email });
        this.submitted.set(false);
      }
    });
    this.loadUsage();
  }

  protected loadUsage(): void {
    forkJoin({
      budgets: this.budgetsApi.summary(currentMonth()).pipe(
        map((summary) => summary.items.length),
        catchError(() => of(0)),
      ),
      goals: this.goalsApi.list(false).pipe(
        map((goals) => goals.filter((goal) => !goal.isArchived && !goal.isAchieved).length),
        catchError(() => of(0)),
      ),
    }).subscribe((usage) => this.usage.set(usage));
  }

  protected profileError(name: ProfileField): string | undefined {
    const control = this.profileForm.controls[name];
    const server = serverError(control);
    if (server) {
      return server;
    }
    if (!control.errors || !(control.touched || this.submitted())) {
      return undefined;
    }
    if (control.errors['pattern']) {
      return EMAIL_MESSAGE;
    }
    if (control.errors['maxlength']) {
      return `Не більше ${(control.errors['maxlength'] as { requiredLength: number }).requiredLength} символів`;
    }
    return REQUIRED_MESSAGE;
  }

  protected resetProfile(): void {
    const user = this.user();
    if (user) {
      this.profileForm.reset({ firstName: user.firstName, lastName: user.lastName, email: user.email });
      this.submitted.set(false);
    }
  }

  protected saveProfile(): void {
    this.submitted.set(true);
    const raw = this.profileForm.getRawValue();
    const request = { firstName: raw.firstName.trim(), lastName: raw.lastName.trim(), email: raw.email.trim() };
    this.profileForm.patchValue(request, { emitEvent: false });
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      document.querySelector<HTMLElement>('#profile input.ng-invalid')?.focus();
      return;
    }
    this.profileSaving.set(true);
    this.authApi.updateProfile(request).subscribe({
      next: (user) => {
        this.profileSaving.set(false);
        this.auth.updateUser(user);
        this.toast.success('Профіль оновлено');
      },
      error: (error: unknown) => {
        this.profileSaving.set(false);
        if (!(error instanceof HttpErrorResponse)) {
          return;
        }
        const body: unknown = error.error;
        if (error.status === 409 && isApiError(body)) {
          this.profileForm.controls.email.setErrors({ server: body.detail });
          this.profileForm.controls.email.markAsTouched();
        } else if (error.status === 400) {
          applyServerErrors(this.profileForm, error);
        }
      },
    });
  }

  protected askPlan(plan: PlanCode): void {
    this.confirmation.set({ kind: 'plan', plan });
  }

  protected newAccount(): void {
    if (this.accountLimitReached()) {
      this.upgradeMessage.set('У тарифі Старт доступно 2 рахунки. Перейдіть на Плюс, щоб додати готівку чи інші картки.');
      return;
    }
    this.accountModal.set({ account: null });
  }

  protected onAccountSaved(): void {
    this.accountModal.set(null);
    this.store.reloadAccounts();
  }

  protected makeDefault(account: AccountDto): void {
    this.accountsApi
      .update(account.id, { name: account.name, type: account.type, initialBalance: account.initialBalance, isDefault: true })
      .subscribe({
        next: () => {
          this.toast.success(`«${account.name}» тепер основний рахунок`);
          this.store.reloadAccounts();
        },
        error: (error: unknown) => this.showConflict(error),
      });
  }

  protected openCategory(category: CategoryDto | null): void {
    this.categoryModal.set({ category });
  }

  protected onCategorySaved(): void {
    this.categoryModal.set(null);
    this.store.reloadCategories();
  }

  protected askDeleteCategory(category: CategoryDto): void {
    this.categoryModal.set(null);
    this.confirmation.set({ kind: 'category', category });
  }

  protected runConfirmation(): void {
    const value = this.confirmation();
    if (!value) {
      return;
    }
    this.confirmBusy.set(true);
    const finish = (message: string, after: () => void): void => {
      this.confirmBusy.set(false);
      this.confirmation.set(null);
      this.toast.success(message);
      after();
    };
    const fail = (error: unknown): void => {
      this.confirmBusy.set(false);
      this.confirmation.set(null);
      this.showConflict(error);
    };
    if (value.kind === 'account') {
      this.accountsApi.delete(value.account.id).subscribe({
        next: () => finish('Рахунок видалено', () => this.store.reloadAccounts()),
        error: fail,
      });
    } else if (value.kind === 'category') {
      this.categoriesApi.delete(value.category.id).subscribe({
        next: () => finish('Категорію видалено', () => this.store.reloadCategories()),
        error: fail,
      });
    } else {
      this.authApi.changePlan({ planCode: value.plan }).subscribe({
        next: (response) => {
          this.auth.setSession(response);
          finish(value.plan === 'plus' ? 'Тариф змінено на Плюс' : 'Тариф змінено на Старт', () => this.loadUsage());
        },
        error: fail,
      });
    }
  }

  protected accountTypeText(account: AccountDto): string {
    const label = accountTypeLabel(account.type);
    return account.isDefault ? `${label} · основний рахунок` : label;
  }

  protected transactionsText(count: number): string {
    return count === 0 ? 'без транзакцій' : `${count} тр.`;
  }

  protected money(value: number): string {
    return formatMoney(value);
  }

  protected price(value: number): string {
    return formatPrice(value);
  }

  protected logout(): void {
    void this.auth.logout();
  }

  private showConflict(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      return;
    }
    const body: unknown = error.error;
    if (error.status === 409 && isApiError(body)) {
      this.toast.error(body.detail);
    }
  }
}
