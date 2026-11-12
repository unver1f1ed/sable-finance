import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlanComparisonDto, PlanDto, PlanFeatureValueDto } from '../../../core/models/public-content';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { SableCardComponent } from '../../../shared/ui/sable-card/sable-card.component';
import { formatPrice } from '../../../shared/util/format';

export type Billing = 'monthly' | 'yearly';
export type CompareVisual = 'images' | 'cards';

@Component({
  selector: 'sb-plans-compare',
  imports: [RouterLink, ButtonDirective, IconComponent, SableCardComponent],
  templateUrl: './plans-compare.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PlansCompareComponent {
  readonly data = input.required<PlanComparisonDto>();
  readonly rows = input<number>();
  readonly billing = input<Billing>('yearly');
  readonly visual = input<CompareVisual>('cards');

  protected readonly codes = ['plus', 'start'];
  protected readonly plus = computed(() => this.data().plans.find((plan) => plan.code === 'plus'));
  protected readonly start = computed(() => this.data().plans.find((plan) => plan.code === 'start'));
  protected readonly features = computed(() => {
    const limit = this.rows();
    const all = this.data().features;
    return limit === undefined ? all : all.slice(0, limit);
  });

  protected price(plan: PlanDto | undefined): string {
    if (!plan) {
      return '';
    }
    return formatPrice(this.billing() === 'yearly' ? plan.priceYearlyPerMonth : plan.priceMonthly);
  }

  protected value(values: Record<string, PlanFeatureValueDto>, code: string): PlanFeatureValueDto | undefined {
    return values[code];
  }
}
