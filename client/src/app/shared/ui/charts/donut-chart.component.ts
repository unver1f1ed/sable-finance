import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output } from '@angular/core';
import { formatMoney } from '../../util/format';
import { computeDonut } from './chart-math';

export interface DonutSegment {
  id: string;
  label: string;
  value: number;
  color: string;
  selectable?: boolean;
}

const SIZE = 180;
const STROKE = 24;
const RADIUS = (SIZE - STROKE) / 2;

@Component({
  selector: 'sb-donut-chart',
  templateUrl: './donut-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class DonutChartComponent {
  readonly segments = input.required<DonutSegment[]>();
  readonly centerLabel = input('Усього');
  readonly ariaLabel = input('Розподіл витрат за категоріями');
  readonly selected = output<DonutSegment>();

  protected readonly size = SIZE;
  protected readonly stroke = STROKE;
  protected readonly radius = RADIUS;
  protected readonly total = computed(() => this.segments().reduce((sum, segment) => sum + Math.max(segment.value, 0), 0));
  protected readonly arcs = computed(() => computeDonut(this.segments().map((segment) => segment.value), RADIUS));
  protected readonly rows = computed(() =>
    this.segments().map((segment, index) => ({
      segment,
      arc: this.arcs()[index],
      percent: this.total() === 0 ? 0 : Math.round((Math.max(segment.value, 0) / this.total()) * 100),
    })),
  );
  protected readonly totalText = computed(() => formatMoney(this.total()));

  protected money(value: number): string {
    return formatMoney(value);
  }
}
