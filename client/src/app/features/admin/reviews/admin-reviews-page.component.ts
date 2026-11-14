import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, map, of, switchMap } from 'rxjs';
import { AdminReviewsApiService } from '../../../core/api/admin-reviews-api.service';
import { PublicContentApiService } from '../../../core/api/public-content-api.service';
import { AdminReviewDto } from '../../../core/models/admin';
import { Paged } from '../../../core/models/finance';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { CategoryIconComponent } from '../../../shared/ui/category-icon/category-icon.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { IconButtonDirective } from '../../../shared/ui/icon-button/icon-button.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { RatingComponent } from '../../../shared/ui/rating/rating.component';
import { SegmentedComponent, SegmentedOption } from '../../../shared/ui/segmented/segmented.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/select/select.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { formatDateDots } from '../../../shared/util/format';
import { PublicContentService } from '../../public/data/public-content.service';
import {
  ReviewFilters,
  activeReviewFilterCount,
  reviewFiltersFromParams,
  reviewFiltersToParams,
  reviewFiltersToQuery,
} from './admin-reviews-logic';
import { ReviewModalComponent } from './review-modal.component';

const SEARCH_DEBOUNCE_MS = 300;

interface ReviewStats {
  average: number;
  published: number;
  hidden: number;
}

@Component({
  selector: 'sb-admin-reviews-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    AvatarComponent,
    BadgeComponent,
    ButtonDirective,
    CategoryIconComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    FieldComponent,
    IconButtonDirective,
    IconComponent,
    PaginationComponent,
    RatingComponent,
    ReviewModalComponent,
    SegmentedComponent,
    SelectComponent,
    SkeletonComponent,
  ],
  templateUrl: './admin-reviews-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AdminReviewsPageComponent {
  protected readonly statusOptions: SegmentedOption[] = [
    { value: 'all', label: 'Усі' },
    { value: 'published', label: 'На сайті' },
    { value: 'hidden', label: 'Приховані' },
  ];
  protected readonly ratingOptions: SelectOption[] = [
    { value: '', label: 'Будь-яка оцінка' },
    ...[5, 4, 3, 2, 1].map((value) => ({ value: String(value), label: `${value} із 5` })),
  ];
  protected readonly skeletonRows = Array.from({ length: 6 }, (_, index) => index);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly data = signal<Paged<AdminReviewDto> | null>(null);
  protected readonly stats = signal<ReviewStats | null>(null);
  protected readonly busy = signal(false);
  protected readonly modal = signal<{ review: AdminReviewDto | null } | null>(null);
  protected readonly deleting = signal<AdminReviewDto | null>(null);
  protected readonly deleteBusy = signal(false);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AdminReviewsApiService);
  private readonly publicApi = inject(PublicContentApiService);
  private readonly content = inject(PublicContentService);
  private readonly toast = inject(ToastService);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly reloadTick = signal(0);

  protected readonly filters = computed(() => reviewFiltersFromParams(this.params()));
  protected readonly filterCount = computed(() => activeReviewFilterCount(this.filters()));
  protected readonly statusValue = computed(() => this.filters().status ?? 'all');
  protected readonly averageText = computed(() => {
    const stats = this.stats();
    return stats && stats.average > 0 ? stats.average.toFixed(1).replace('.', ',') : '—';
  });

  constructor() {
    toObservable(computed(() => ({ query: reviewFiltersToQuery(this.filters()), tick: this.reloadTick() })))
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
        switchMap(() =>
          forkJoin({
            average: this.publicApi.reviews(true).pipe(map((reviews) => reviews.average)),
            published: this.api.list({ status: 'published', pageSize: 10 }).pipe(map((page) => page.total)),
            hidden: this.api.list({ status: 'hidden', pageSize: 10 }).pipe(map((page) => page.total)),
          }).pipe(catchError(() => of(null))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((stats) => this.stats.set(stats));

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

  protected update(patch: Partial<ReviewFilters>, replace = false): void {
    const next = { ...this.filters(), ...patch, page: patch.page ?? 1 };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: reviewFiltersToParams(next),
      queryParamsHandling: 'merge',
      replaceUrl: replace,
    });
  }

  protected changeStatus(value: string): void {
    this.update({ status: value === 'published' || value === 'hidden' ? value : null });
  }

  protected resetFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: reviewFiltersToParams(reviewFiltersFromParams(convertToParamMap({}))),
      queryParamsHandling: 'merge',
    });
  }

  protected retry(): void {
    this.state.set('loading');
    this.reload();
  }

  protected reload(): void {
    this.reloadTick.update((value) => value + 1);
    this.content.invalidate('reviews');
  }

  protected onSaved(): void {
    this.modal.set(null);
    this.reload();
  }

  protected date(iso: string): string {
    return formatDateDots(iso);
  }

  protected togglePublished(review: AdminReviewDto): void {
    this.api
      .update(review.id, { author: review.author, text: review.text, rating: review.rating, isPublished: !review.isPublished })
      .subscribe({
        next: () => {
          this.toast.success(review.isPublished ? 'Відгук приховано' : 'Відгук опубліковано');
          this.reload();
        },
        error: () => undefined,
      });
  }

  protected confirmDelete(): void {
    const review = this.deleting();
    if (!review) {
      return;
    }
    this.deleteBusy.set(true);
    this.api.delete(review.id).subscribe({
      next: () => {
        this.deleteBusy.set(false);
        this.deleting.set(null);
        this.toast.success('Відгук видалено');
        this.reload();
      },
      error: () => {
        this.deleteBusy.set(false);
        this.deleting.set(null);
      },
    });
  }
}
