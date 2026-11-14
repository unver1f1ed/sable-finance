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

  protected readonly marqueeGroups = [0, 1];
  protected readonly marqueePhrases = [0, 1, 2];
  protected readonly columns = computed(() => {
    const plans = this.data().plans;
    return ['plus', 'start'].flatMap((code) => plans.filter((plan) => plan.code === code));
  });
  protected readonly features = computed(() => {
    const limit = this.rows();
    const all = this.data().features;
    return limit === undefined ? all : all.slice(0, limit);
  });

  protected shortName(plan: PlanDto): string {
    return plan.name.replace(/^Sable\s+/, '');
  }

  protected price(plan: PlanDto): string {
    return formatPrice(this.billing() === 'yearly' ? plan.priceYearlyPerMonth : plan.priceMonthly);
  }

  protected value(values: Record<string, PlanFeatureValueDto>, code: string): PlanFeatureValueDto | undefined {
    return values[code];
  }
}
