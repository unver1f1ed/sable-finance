import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

export type CategoryIconSize = 'sm' | 'md';

@Component({
  selector: 'sb-category-icon',
  imports: [IconComponent],
  template: '<sb-icon [name]="icon()" [size]="iconSize()" />',
  host: {
    '[class]': 'classes()',
    '[style.--category-color]': 'color()',
    'aria-hidden': 'true',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class CategoryIconComponent {
  readonly icon = input.required<string>();
  readonly color = input('#6FDBD4');
  readonly size = input<CategoryIconSize>('md');

  protected readonly iconSize = computed(() => (this.size() === 'sm' ? 18 : 20));
  protected readonly classes = computed(() => `category-icon category-icon--${this.size()}`);
}
