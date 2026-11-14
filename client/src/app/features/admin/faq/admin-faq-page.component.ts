import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { AdminFaqApiService } from '../../../core/api/admin-faq-api.service';
import { isApiError } from '../../../core/models/api-error';
import { AdminFaqItemDto, AdminFaqTopicDto } from '../../../core/models/admin';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { PublicContentService } from '../../public/data/public-content.service';
import { FaqFilters, decideSwitch, faqFiltersFromParams, faqFiltersToParams } from './admin-faq-logic';
import { FaqEditorComponent } from './faq-editor.component';
import { TopicModalComponent } from './topic-modal.component';

const SEARCH_DEBOUNCE_MS = 300;
const WIDE_QUERY = '(min-width: 1024px)';
const NEW_KEY = 'new';

type Pending = () => void;
type Deletion = { kind: 'item'; item: AdminFaqItemDto } | { kind: 'topic'; topic: AdminFaqTopicDto };

@Component({
  selector: 'sb-admin-faq-page',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    BadgeComponent,
    ButtonDirective,
    ConfirmDialogComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    FaqEditorComponent,
    FieldComponent,
    IconComponent,
    ModalComponent,
    SkeletonComponent,
    TopicModalComponent,
  ],
  templateUrl: './admin-faq-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AdminFaqPageComponent {
  protected readonly skeletonRows = Array.from({ length: 6 }, (_, index) => index);
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly topics = signal<AdminFaqTopicDto[]>([]);
  protected readonly topicsState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly items = signal<AdminFaqItemDto[]>([]);
  protected readonly itemsState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly creating = signal(false);
  protected readonly editorKey = signal(0);
  protected readonly dirty = signal(false);
  protected readonly wide = signal(true);
  protected readonly topicModal = signal(false);
  protected readonly deletion = signal<Deletion | null>(null);
  protected readonly deleteBusy = signal(false);
  protected readonly pending = signal<Pending | null>(null);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AdminFaqApiService);
  private readonly content = inject(PublicContentService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly itemsTick = signal(0);
  private readonly topicsTick = signal(0);

  protected readonly filters = computed(() => faqFiltersFromParams(this.params()));
  protected readonly totalCount = computed(() => this.topics().reduce((sum, topic) => sum + topic.itemCount, 0));
  protected readonly selected = computed(() => {
    const id = this.filters().item;
    return id ? (this.items().find((item) => item.id === id) ?? null) : null;
  });
  protected readonly editorOpen = computed(() => this.creating() || this.selected() !== null);
  protected readonly editorItem = computed(() => (this.creating() ? null : this.selected()));
  protected readonly deleteTitle = computed(() => (this.deletion()?.kind === 'topic' ? 'Видалити тему?' : 'Видалити питання?'));
  protected readonly deleteMessage = computed(() => {
    const value = this.deletion();
    if (!value) {
      return '';
    }
    return value.kind === 'topic' ? `Тему «${value.topic.name}» буде видалено.` : `Питання «${value.item.question}» буде видалено без можливості відновлення.`;
  });

  constructor() {
    toObservable(computed(() => ({ search: this.filters().search, topicId: this.filters().topicId, tick: this.itemsTick() })))
      .pipe(
        switchMap(({ search, topicId }) => this.api.items({ search, topicId }).pipe(catchError(() => of(null)))),
        takeUntilDestroyed(),
      )
      .subscribe((items) => {
        if (items) {
          this.items.set(items);
          this.itemsState.set('ready');
        } else {
          this.itemsState.set('error');
        }
      });

    toObservable(this.topicsTick)
      .pipe(
        switchMap(() => this.api.topics().pipe(catchError(() => of(null)))),
        takeUntilDestroyed(),
      )
      .subscribe((topics) => {
        if (topics) {
          this.topics.set(topics);
          this.topicsState.set('ready');
        } else {
          this.topicsState.set('error');
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

    afterNextRender(() => {
      const query = window.matchMedia(WIDE_QUERY);
      const sync = (): void => this.wide.set(query.matches);
      sync();
      query.addEventListener('change', sync);
      this.destroyRef.onDestroy(() => query.removeEventListener('change', sync));
    });
  }

  protected update(patch: Partial<FaqFilters>, replace = false): void {
    const next = { ...this.filters(), ...patch };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: faqFiltersToParams(next),
      queryParamsHandling: 'merge',
      replaceUrl: replace,
    });
  }

  protected selectTopic(topicId: string | null): void {
    this.update({ topicId });
  }

  protected currentKey(): string | null {
    return this.creating() ? NEW_KEY : this.filters().item;
  }

  protected guarded(targetKey: string | null, action: Pending): void {
    const decision = decideSwitch(this.dirty(), this.currentKey(), targetKey);
    if (decision === 'confirm') {
      this.pending.set(action);
    } else if (decision === 'switch') {
      action();
    }
  }

  protected openItem(item: AdminFaqItemDto): void {
    this.guarded(item.id, () => this.applyOpen(item.id));
  }

  protected newItem(): void {
    this.guarded(NEW_KEY, () => this.applyNew());
  }

  protected closeEditor(): void {
    this.guarded(null, () => this.applyClose());
  }

  protected confirmDiscard(): void {
    const action = this.pending();
    this.pending.set(null);
    this.dirty.set(false);
    action?.();
  }

  protected onSaved(item: AdminFaqItemDto): void {
    this.creating.set(false);
    this.dirty.set(false);
    this.content.invalidate('faq');
    this.reloadAll();
    this.update({ item: item.id, topicId: this.filters().topicId });
  }

  protected askDeleteItem(item: AdminFaqItemDto): void {
    this.deletion.set({ kind: 'item', item });
  }

  protected askDeleteTopic(topic: AdminFaqTopicDto, event: Event): void {
    event.stopPropagation();
    this.deletion.set({ kind: 'topic', topic });
  }

  protected onTopicCreated(topic: AdminFaqTopicDto): void {
    this.topicModal.set(false);
    this.topicsTick.update((value) => value + 1);
    this.update({ topicId: topic.id });
  }

  protected retry(): void {
    this.itemsState.set('loading');
    this.topicsState.set('loading');
    this.reloadAll();
  }

  protected confirmDelete(): void {
    const value = this.deletion();
    if (!value) {
      return;
    }
    this.deleteBusy.set(true);
    const request = value.kind === 'item' ? this.api.deleteItem(value.item.id) : this.api.deleteTopic(value.topic.id);
    request.subscribe({
      next: () => {
        this.deleteBusy.set(false);
        this.deletion.set(null);
        this.toast.success(value.kind === 'item' ? 'Питання видалено' : 'Тему видалено');
        this.content.invalidate('faq');
        if (value.kind === 'item') {
          this.dirty.set(false);
          this.applyClose();
        } else if (this.filters().topicId === value.topic.id) {
          this.update({ topicId: null });
        }
        this.reloadAll();
      },
      error: (error: unknown) => {
        this.deleteBusy.set(false);
        this.deletion.set(null);
        const body: unknown = error instanceof HttpErrorResponse ? error.error : null;
        if (error instanceof HttpErrorResponse && error.status === 409 && isApiError(body)) {
          this.toast.error(body.detail);
        }
      },
    });
  }

  private applyOpen(id: string): void {
    this.creating.set(false);
    this.dirty.set(false);
    this.editorKey.update((value) => value + 1);
    this.update({ item: id });
  }

  private applyNew(): void {
    this.dirty.set(false);
    this.editorKey.update((value) => value + 1);
    this.creating.set(true);
    this.update({ item: null });
  }

  private applyClose(): void {
    this.creating.set(false);
    this.dirty.set(false);
    this.update({ item: null });
  }

  private reloadAll(): void {
    this.itemsTick.update((value) => value + 1);
    this.topicsTick.update((value) => value + 1);
  }
}
