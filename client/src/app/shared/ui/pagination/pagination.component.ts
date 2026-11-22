import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconButtonDirective } from '../icon-button/icon-button.directive';
import { IconComponent } from '../icon/icon.component';
import { SelectComponent, SelectOption } from '../select/select.component';

const MAX_VISIBLE_PAGES = 7;

@Component({
  selector: 'sb-pagination',
  imports: [FormsModule, IconButtonDirective, IconComponent, SelectComponent],
  templateUrl: './pagination.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PaginationComponent {
  readonly page = input(1);
  readonly pageSize = input(10);
  readonly total = input(0);
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  protected readonly sizeOptions: SelectOption[] = [10, 20, 50].map((size) => ({ value: String(size), label: String(size) }));

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  protected readonly from = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1));
  protected readonly to = computed(() => Math.min(this.total(), this.page() * this.pageSize()));

  protected readonly items = computed<(number | null)[]>(() => {
    const count = this.pageCount();
    const current = this.page();
    if (count <= MAX_VISIBLE_PAGES) {
      return Array.from({ length: count }, (_, index) => index + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, null, count];
    }
    if (current >= count - 3) {
      return [1, null, count - 4, count - 3, count - 2, count - 1, count];
    }
    return [1, null, current - 1, current, current + 1, null, count];
  });

  protected go(page: number): void {
    if (page < 1 || page > this.pageCount() || page === this.page()) {
      return;
    }
    this.pageChange.emit(page);
  }

  protected changeSize(value: string): void {
    this.pageSizeChange.emit(Number(value));
  }
}
