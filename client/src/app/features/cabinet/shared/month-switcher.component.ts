import { ChangeDetectionStrategy, Component, ViewEncapsulation, booleanAttribute, computed, input, output } from '@angular/core';
import { IconButtonDirective } from '../../../shared/ui/icon-button/icon-button.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { currentMonth, shiftMonth } from '../../../shared/util/date';
import { formatMonth } from '../../../shared/util/format';

const ALL_TIME_MONTH = 'all';

@Component({
  selector: 'sb-month-switcher',
  imports: [IconButtonDirective, IconComponent],
  templateUrl: './month-switcher.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class MonthSwitcherComponent {
  readonly month = input.required<string>();
  readonly allowAll = input(false, { transform: booleanAttribute });
  readonly monthChange = output<string>();

  protected readonly isAll = computed(() => this.month() === ALL_TIME_MONTH);
  protected readonly label = computed(() => (this.isAll() ? 'Увесь час' : formatMonth(this.month())));
  protected readonly nextDisabled = computed(() => this.isAll() || this.month() >= currentMonth());

  protected previous(): void {
    this.monthChange.emit(shiftMonth(this.month(), -1));
  }

  protected next(): void {
    this.monthChange.emit(shiftMonth(this.month(), 1));
  }

  protected toggleAll(): void {
    this.monthChange.emit(this.isAll() ? currentMonth() : ALL_TIME_MONTH);
  }
}
