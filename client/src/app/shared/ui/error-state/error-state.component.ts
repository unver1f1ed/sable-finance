import { ChangeDetectionStrategy, Component, ViewEncapsulation, input, output } from '@angular/core';
import { ButtonDirective } from '../button/button.directive';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'sb-error-state',
  imports: [ButtonDirective, IconComponent],
  templateUrl: './error-state.component.html',
  host: { class: 'error-state card', role: 'alert', '[attr.title]': 'null' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ErrorStateComponent {
  readonly title = input('Не вдалося завантажити дані');
  readonly text = input('Перевірте з’єднання та повторіть спробу.');
  readonly retry = output<void>();
}
