import { ChangeDetectionStrategy, Component, ViewEncapsulation, booleanAttribute, computed, input } from '@angular/core';

const TONE_COLORS: Record<string, string> = {
  accent: 'var(--color-accent)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
};

@Component({
  selector: 'sb-progress',
  template: '<i class="progress__bar" [style.width.%]="width()" [style.background]="color()"></i>',
  host: {
    class: 'progress',
    '[class.progress--thick]': 'thick()',
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'width()',
    '[attr.aria-valuetext]': 'valueText()',
    '[attr.aria-label]': 'label()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ProgressComponent {
  readonly value = input.required<number>();
  readonly tone = input<string>('accent');
  readonly thick = input(false, { transform: booleanAttribute });
  readonly label = input<string>();

  protected readonly width = computed(() => Math.min(100, Math.max(0, Math.round(this.value()))));
  protected readonly valueText = computed(() => `${Math.round(this.value())}%`);
  protected readonly color = computed(() => TONE_COLORS[this.tone()] ?? this.tone());
}
