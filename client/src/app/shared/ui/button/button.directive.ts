import { Directive, booleanAttribute, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'white' | 'ghost' | 'danger' | 'danger-solid';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Directive({
  selector: 'button[sbButton], a[sbButton]',
  host: {
    class: 'btn',
    '[class.btn--primary]': "variant() === 'primary'",
    '[class.btn--white]': "variant() === 'white'",
    '[class.btn--ghost]': "variant() === 'ghost'",
    '[class.btn--danger]': "variant() === 'danger'",
    '[class.btn--danger-solid]': "variant() === 'danger-solid'",
    '[class.btn--sm]': "size() === 'sm'",
    '[class.btn--md]': "size() === 'md'",
    '[class.btn--lg]': "size() === 'lg'",
    '[class.btn--block]': 'block()',
  },
})
export class ButtonDirective {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly block = input(false, { transform: booleanAttribute });
}
