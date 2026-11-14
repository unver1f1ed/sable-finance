import { Directive, input } from '@angular/core';

@Directive({
  selector: 'button[sbIconButton], a[sbIconButton]',
  host: {
    class: 'icon-btn',
    '[class.icon-btn--sm]': "size() === 'sm'",
    '[class.icon-btn--md]': "size() === 'md'",
  },
})
export class IconButtonDirective {
  readonly size = input<'sm' | 'md'>('md');
}
