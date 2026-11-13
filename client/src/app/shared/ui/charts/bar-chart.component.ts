import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, signal } from '@angular/core';
import { formatCompact, formatMoney } from '../../util/format';
import { niceScale } from './chart-math';

export interface BarChartDatum {
  label: string;
  income: number;
  expense: number;
  current?: boolean;
}

const WIDTH = 600;
const HEIGHT = 260;
const LEFT = 56;
const TOP = 12;
const BOTTOM = 32;
const BAR_WIDTH = 22;
const BAR_GAP = 6;

interface BarGroup {
  index: number;
  label: string;
  current: boolean;
  center: number;
  incomeX: number;
  expenseX: number;
  incomeHeight: number;
  expenseHeight: number;
  tooltip: string;
  tooltipLeft: number;
  tooltipTop: number;
}

@Component({
  selector: 'sb-bar-chart',
  templateUrl: './bar-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class BarChartComponent {
  readonly data = input.required<BarChartDatum[]>();
  readonly ariaLabel = input('Доходи та витрати за місяцями');

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly left = LEFT;
  protected readonly baseline = HEIGHT - BOTTOM;
  protected readonly active = signal<number | null>(null);

  protected readonly hasData = computed(() => this.data().some((item) => item.income > 0 || item.expense > 0));
  protected readonly scale = computed(() => niceScale(Math.max(0, ...this.data().flatMap((item) => [item.income, item.expense]))));
  protected readonly plotHeight = HEIGHT - TOP - BOTTOM;

  protected readonly ticks = computed(() => {
    const { max, ticks } = this.scale();
    return ticks.map((value) => ({
      value,
      label: formatCompact(value),
      y: TOP + this.plotHeight - (max === 0 ? 0 : (value / max) * this.plotHeight),
    }));
  });

  protected readonly groups = computed<BarGroup[]>(() => {
    const items = this.data();
    const { max } = this.scale();
    const plotWidth = WIDTH - LEFT;
    const slot = plotWidth / Math.max(items.length, 1);
    return items.map((item, index) => {
      const center = LEFT + slot * index + slot / 2;
      const incomeHeight = max === 0 ? 0 : (item.income / max) * this.plotHeight;
      const expenseHeight = max === 0 ? 0 : (item.expense / max) * this.plotHeight;
      const top = TOP + this.plotHeight - Math.max(incomeHeight, expenseHeight);
      return {
        index,
        label: item.label,
        current: !!item.current,
        center,
        incomeX: center - BAR_GAP / 2 - BAR_WIDTH,
        expenseX: center + BAR_GAP / 2,
        incomeHeight,
        expenseHeight,
        tooltip: `${formatMoney(item.income, { sign: true })} · ${formatMoney(-item.expense)}`,
        tooltipLeft: (center / WIDTH) * 100,
        tooltipTop: (top / HEIGHT) * 100,
      };
    });
  });

  protected readonly activeGroup = computed(() => {
    const index = this.active();
    return index === null ? null : (this.groups()[index] ?? null);
  });

  protected money(value: number): string {
    return formatMoney(value);
  }

  protected show(index: number): void {
    this.active.set(index);
  }

  protected hide(index: number): void {
    if (this.active() === index) {
      this.active.set(null);
    }
  }
}
