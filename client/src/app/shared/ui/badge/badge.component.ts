import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

export type BadgeTone = 'teal' | 'grey' | 'red' | 'amber' | 'purple';

@Component({
  selector: 'sb-badge',
  template: '<ng-content />',
  host: { '[class]': 'classes()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('teal');

  protected readonly classes = computed(() => `badge badge--${this.tone()}`);
}
