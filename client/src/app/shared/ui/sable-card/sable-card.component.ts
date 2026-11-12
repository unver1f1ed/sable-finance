import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

export type SableCardVariant = 'dark' | 'light';

@Component({
  selector: 'sb-sable-card',
  templateUrl: './sable-card.component.html',
  host: {
    '[class]': 'classes()',
    '[style.--card-width]': 'width() + "px"',
    'aria-hidden': 'true',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SableCardComponent {
  readonly variant = input<SableCardVariant>('dark');
  readonly label = input('Sable Плюс');
  readonly width = input(300);

  protected readonly classes = computed(() => `sable-card sable-card--${this.variant()}`);
}
