import { ChangeDetectionStrategy, Component, ViewEncapsulation, booleanAttribute, input, output } from '@angular/core';
import { ButtonDirective } from '../button/button.directive';
import { CategoryIconComponent } from '../category-icon/category-icon.component';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'sb-confirm-dialog',
  imports: [ButtonDirective, CategoryIconComponent, ModalComponent],
  templateUrl: './confirm-dialog.component.html',
  host: { '[attr.title]': 'null' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Підтвердити');
  readonly danger = input(false, { transform: booleanAttribute });
  readonly busy = input(false, { transform: booleanAttribute });
  readonly confirm = output<void>();
  // `cancel` reads naturally next to `confirm`, so the native event name is kept on purpose.
  // eslint-disable-next-line @angular-eslint/no-output-native
  readonly cancel = output<void>();
}
