import { Directive, booleanAttribute, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'white' | 'ghost' | 'danger' | 'danger-solid';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Directive({
  selector: 'button[sbButton], a[sbButton]',
  host: { '[class]': 'classes()' },
})
export class ButtonDirective {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly block = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() => {
    const list = ['btn', `btn--${this.variant()}`, `btn--${this.size()}`];
    if (this.block()) {
      list.push('btn--block');
    }
    return list.join(' ');
  });
}
