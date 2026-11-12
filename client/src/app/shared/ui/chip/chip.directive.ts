import { Directive, booleanAttribute, input } from '@angular/core';

@Directive({
  selector: 'button[sbChip]',
  host: {
    class: 'chip',
    '[class.chip--active]': 'active()',
    '[attr.aria-pressed]': 'active()',
    type: 'button',
  },
})
export class ChipDirective {
  readonly active = input(false, { transform: booleanAttribute });
}
