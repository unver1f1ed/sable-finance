import { Directive, computed, input } from '@angular/core';

export type IconButtonSize = 'sm' | 'md';

@Directive({
  selector: 'button[sbIconButton], a[sbIconButton]',
  host: { '[class]': 'classes()' },
})
export class IconButtonDirective {
  readonly size = input<IconButtonSize>('md');

  protected readonly classes = computed(() => `icon-btn icon-btn--${this.size()}`);
}
