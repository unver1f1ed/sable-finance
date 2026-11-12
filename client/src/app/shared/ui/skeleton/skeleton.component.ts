import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

@Component({
  selector: 'sb-skeleton',
  template: '',
  host: {
    class: 'skeleton',
    'aria-hidden': 'true',
    '[style.width]': 'cssWidth()',
    '[style.height]': 'cssHeight()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SkeletonComponent {
  readonly width = input<string | number>('100%');
  readonly height = input<string | number>(14);

  protected readonly cssWidth = computed(() => toCss(this.width()));
  protected readonly cssHeight = computed(() => toCss(this.height()));
}

function toCss(value: string | number): string {
  return typeof value === 'number' ? `${value}px` : value;
}
