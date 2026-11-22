import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { AdminPlansApiService } from '../../../core/api/admin-plans-api.service';
import { AdminUsersApiService } from '../../../core/api/admin-users-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AdminUserDto, AdminUserStats } from '../../../core/models/admin';
import { isApiError } from '../../../core/models/api-error';
import { Paged } from '../../../core/models/finance';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { CategoryIconComponent } from '../../../shared/ui/category-icon/category-icon.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { IconButtonDirective } from '../../../shared/ui/icon-button/icon-button.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/select/select.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { formatDateDots } from '../../../shared/util/format';
import { AdminUserModalComponent } from './admin-user-modal.component';
import {
  UserFilters,
  activeUserFilterCount,
  userFiltersFromParams,
  userFiltersToParams,
  userFiltersToQuery,
  userStatHints,
  userStatus,
} from './admin-users-logic';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'sb-admin-users-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    AdminUserModalComponent,
    AvatarComponent,
    BadgeComponent,
    ButtonDirective,
    CategoryIconComponent,
    ConfirmDialogComponent,
    ErrorStateComponent,
    FieldComponent,
    IconButtonDirective,
    IconComponent,
    PaginationComponent,
    SelectComponent,
    SkeletonComponent,
  ],
  templateUrl: './admin-users-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AdminUsersPageComponent {
  protected readonly roleOptions: SelectOption[] = [
    { value: '', label: 'Усі ролі' },
    { value: 'User', label: 'Користувач' },
    { value: 'Admin', label: 'Адмін' },
  ];
  protected readonly statusOptions: SelectOption[] = [
    { value: '', label: 'Усі статуси' },
    { value: 'active', label: 'Не заблоковані' },
    { value: 'blocked', label: 'Заблоковані' },
  ];
  protected readonly sortOptions: SelectOption[] = [
    { value: 'created_desc', label: 'Спочатку нові' },
    { value: 'created_asc', label: 'Спочатку старі' },
    { value: 'name_asc', label: 'За іменем' },
  ];
  protected readonly skeletonRows = Array.from({ length: 8 }, (_, index) => index);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly data = signal<Paged<AdminUserDto> | null>(null);
  protected readonly stats = signal<AdminUserStats | null>(null);
  protected readonly planOptions = signal<SelectOption[]>([]);
  protected readonly busy = signal(false);
  protected readonly editing = signal<AdminUserDto | null>(null);
  protected readonly deleting = signal<AdminUserDto | null>(null);
  protected readonly deleteBusy = signal(false);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AdminUsersApiService);
  private readonly plansApi = inject(AdminPlansApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly reloadTick = signal(0);

  protected readonly filters = computed(() => userFiltersFromParams(this.params()));
  protected readonly filterCount = computed(() => activeUserFilterCount(this.filters()));
  protected readonly hints = computed(() => {
    const stats = this.stats();
    return stats ? userStatHints(stats) : null;
  });
  protected readonly planFilterOptions = computed<SelectOption[]>(() => [{ value: '', label: 'Усі тарифи' }, ...this.planOptions()]);
  protected readonly planNames = computed(() => new Map(this.planOptions().map((option) => [option.value, option.label])));
  protected readonly deleteMessage = computed(() => {
    const user = this.deleting();
    return user ? `Акаунт ${user.firstName} ${user.lastName} і всі його фінансові дані буде видалено без можливості відновлення.` : '';
  });

  constructor() {
    toObservable(computed(() => ({ query: userFiltersToQuery(this.filters()), tick: this.reloadTick() })))
      .pipe(
        switchMap(({ query }) => {
          this.busy.set(true);
          return this.api.list(query).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((list) => {
        this.busy.set(false);
        if (list) {
          this.data.set(list);
          this.state.set('ready');
        } else {
          this.state.set(this.data() ? 'ready' : 'error');
        }
      });

    toObservable(this.reloadTick)
      .pipe(
        switchMap(() => this.api.stats().pipe(catchError(() => of(null)))),
        takeUntilDestroyed(),
      )
      .subscribe((stats) => this.stats.set(stats));

    this.plansApi.plans().subscribe({
      next: (plans) => this.planOptions.set(plans.map((plan) => ({ value: plan.code, label: plan.name.replace(/^Sable\s+/, '') }))),
      error: () => undefined,
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
  }

  protected update(patch: Partial<UserFilters>, replace = false): void {
    const next = { ...this.filters(), ...patch, page: patch.page ?? 1 };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: userFiltersToParams(next),
      queryParamsHandling: 'merge',
      replaceUrl: replace,
    });
  }

  protected resetFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: userFiltersToParams(userFiltersFromParams(convertToParamMap({}))),
      queryParamsHandling: 'merge',
    });
  }

  protected retry(): void {
    this.state.set('loading');
    this.reload();
  }

  protected reload(): void {
    this.reloadTick.update((value) => value + 1);
  }

  protected isSelf(user: AdminUserDto | null): boolean {
    return user !== null && user.id === this.auth.user()?.id;
  }

  protected status(user: AdminUserDto) {
    return userStatus(user);
  }

  protected planName(code: string): string {
    return this.planNames().get(code) ?? code;
  }

  protected date(iso: string): string {
    return formatDateDots(iso);
  }

  protected fullName(user: AdminUserDto): string {
    return `${user.firstName} ${user.lastName}`;
  }

  protected onSaved(): void {
    this.editing.set(null);
    this.reload();
  }

  protected askDelete(user: AdminUserDto): void {
    this.editing.set(null);
    this.deleting.set(user);
  }

  protected confirmDelete(): void {
    const user = this.deleting();
    if (!user) {
      return;
    }
    this.deleteBusy.set(true);
    this.api.delete(user.id).subscribe({
      next: () => {
        this.deleteBusy.set(false);
        this.deleting.set(null);
        this.toast.success('Акаунт видалено');
        this.reload();
      },
      error: (error: unknown) => {
        this.deleteBusy.set(false);
        this.deleting.set(null);
        const body: unknown = error instanceof HttpErrorResponse ? error.error : null;
        if (error instanceof HttpErrorResponse && error.status === 409 && isApiError(body)) {
          this.toast.error(body.detail);
        }
      },
    });
  }
}
