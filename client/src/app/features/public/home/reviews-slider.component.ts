import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { ReviewDto } from '../../../core/models/public-content';
import { IconButtonDirective } from '../../../shared/ui/icon-button/icon-button.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

const SWIPE_THRESHOLD = 40;

@Component({
  selector: 'sb-reviews-slider',
  imports: [IconButtonDirective, IconComponent],
  templateUrl: './reviews-slider.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ReviewsSliderComponent {
  readonly reviews = input.required<ReviewDto[]>();

  protected readonly visible = signal(1);
  protected readonly position = signal(0);

  protected readonly maxPosition = computed(() => Math.max(0, this.reviews().length - this.visible()));
  protected readonly current = computed(() => Math.min(this.position(), this.maxPosition()));
  protected readonly dots = computed(() => Array.from({ length: this.maxPosition() + 1 }, (_, index) => index));

  private touchStartX = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const wide = window.matchMedia('(min-width: 1024px)');
      const medium = window.matchMedia('(min-width: 768px)');
      const update = (): void => this.visible.set(wide.matches ? 3 : medium.matches ? 2 : 1);
      update();
      wide.addEventListener('change', update);
      medium.addEventListener('change', update);
      destroyRef.onDestroy(() => {
        wide.removeEventListener('change', update);
        medium.removeEventListener('change', update);
      });
    });
  }

  protected goTo(index: number): void {
    this.position.set(Math.min(Math.max(index, 0), this.maxPosition()));
  }

  protected previous(): void {
    this.goTo(this.current() - 1);
  }

  protected next(): void {
    this.goTo(this.current() + 1);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    }
  }

  protected onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].clientX;
  }

  protected onTouchEnd(event: TouchEvent): void {
    const delta = event.changedTouches[0].clientX - this.touchStartX;
    if (Math.abs(delta) < SWIPE_THRESHOLD) {
      return;
    }
    if (delta < 0) {
      this.next();
    } else {
      this.previous();
    }
  }
}
