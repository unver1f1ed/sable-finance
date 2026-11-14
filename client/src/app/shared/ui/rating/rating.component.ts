import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'sb-rating',
  imports: [IconComponent],
  template: `
    @for (star of stars; track star) {
      <sb-icon class="rating__star" [class.rating__star--on]="star <= value()" name="star" [size]="size()" />
    }
  `,
  host: { class: 'rating', role: 'img', '[attr.aria-label]': 'label()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class RatingComponent {
  readonly value = input.required<number>();
  readonly size = input(16);

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly label = computed(() => `${this.value()} із 5`);
}
