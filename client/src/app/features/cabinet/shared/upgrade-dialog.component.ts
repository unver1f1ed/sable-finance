import { ChangeDetectionStrategy, Component, ViewEncapsulation, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

@Component({
  selector: 'sb-upgrade-dialog',
  imports: [RouterLink, ButtonDirective, ModalComponent],
  template: `
    <sb-modal [open]="open()" [title]="title()" [width]="460" (closed)="closed.emit()">
      <p class="text-body text-muted">{{ message() }}</p>
      <button modalFooter sbButton variant="ghost" type="button" (click)="closed.emit()">Закрити</button>
      <a modalFooter sbButton routerLink="/app/settings" fragment="plan" (click)="closed.emit()">Перейти на Плюс</a>
    </sb-modal>
  `,
  host: { '[attr.title]': 'null' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class UpgradeDialogComponent {
  readonly open = input(false);
  readonly title = input('Потрібен тариф Плюс');
  readonly message = input('Перейдіть на Плюс, щоб зняти це обмеження.');
  readonly closed = output<void>();
}
