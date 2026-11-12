import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { CategoryIconComponent } from '../category-icon/category-icon.component';

@Component({
  selector: 'sb-empty-state',
  imports: [CategoryIconComponent],
  templateUrl: './empty-state.component.html',
  host: { class: 'empty-state card', '[attr.title]': 'null' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class EmptyStateComponent {
  readonly icon = input('swap');
  readonly title = input.required<string>();
  readonly text = input<string>();
}
