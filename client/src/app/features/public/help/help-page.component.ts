import { ChangeDetectionStrategy, Component, DestroyRef, ViewEncapsulation, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { FaqTopicDto } from '../../../core/models/public-content';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { CategoryIconComponent } from '../../../shared/ui/category-icon/category-icon.component';
import { ChipDirective } from '../../../shared/ui/chip/chip.directive';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { IconButtonDirective } from '../../../shared/ui/icon-button/icon-button.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { resultsLabel } from '../../../shared/util/plural';
import { PublicContentService } from '../data/public-content.service';

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 200;
const ALL_TOPICS = 'all';

interface PopularTopic {
  title: string;
  query: string;
}

@Component({
  selector: 'sb-help-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonDirective,
    CategoryIconComponent,
    ChipDirective,
    EmptyStateComponent,
    FieldComponent,
    IconButtonDirective,
    IconComponent,
  ],
  templateUrl: './help-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class HelpPageComponent {
  protected readonly allTopics = ALL_TOPICS;
  protected readonly topics = inject(PublicContentService).faq();
  protected readonly popular: PopularTopic[] = [
    { title: 'Як поставити фінансову ціль', query: 'ціль' },
    { title: 'Імпорт та експорт транзакцій', query: 'експорт' },
    { title: 'Зміна пароля та вихід з усіх пристроїв', query: 'парол' },
    { title: 'Видалення акаунта й даних', query: 'видалення' },
  ];

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly query = signal('');
  protected readonly topic = signal(ALL_TOPICS);
  protected readonly openItems = signal<ReadonlySet<string>>(new Set(['budget-create']));

  protected readonly activeQuery = computed(() => {
    const value = this.query().trim().toLocaleLowerCase('uk');
    return value.length >= MIN_QUERY_LENGTH ? value : '';
  });

  protected readonly visibleTopics = computed<FaqTopicDto[]>(() => {
    const query = this.activeQuery();
    const topic = this.topic();
    return this.topics()
      .filter((group) => topic === ALL_TOPICS || group.id === topic)
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            !query ||
            item.question.toLocaleLowerCase('uk').includes(query) ||
            item.answer.toLocaleLowerCase('uk').includes(query),
        ),
      }))
      .filter((group) => group.items.length > 0);
  });

  protected readonly resultCount = computed(() =>
    this.visibleTopics().reduce((total, group) => total + group.items.length, 0),
  );
  protected readonly resultText = computed(() => (this.activeQuery() ? resultsLabel(this.resultCount()) : ''));

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((value) => this.query.set(value));

    effect(() => {
      const params = this.params();
      const q = params.get('q') ?? '';
      const topic = params.get('topic') ?? ALL_TOPICS;
      untracked(() => {
        if (q !== this.query()) {
          this.query.set(q);
          this.searchControl.setValue(q, { emitEvent: false });
        }
        if (topic !== this.topic()) {
          this.topic.set(this.topics().some((group) => group.id === topic) ? topic : ALL_TOPICS);
        }
      });
    });

    effect(() => {
      const q = this.query().trim();
      const topic = this.topic();
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { q: q || null, topic: topic === ALL_TOPICS ? null : topic },
        queryParamsHandling: 'merge',
        replaceUrl: true,
        preserveFragment: true,
      });
    });
  }

  protected selectTopic(id: string): void {
    this.topic.set(id);
  }

  protected clearSearch(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.query.set('');
  }

  protected toggle(id: string): void {
    this.openItems.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }
}
