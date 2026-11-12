import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { SableCardComponent } from '../../../shared/ui/sable-card/sable-card.component';
import { SegmentedComponent, SegmentedOption } from '../../../shared/ui/segmented/segmented.component';
import { formatPrice } from '../../../shared/util/format';
import { PublicContentService } from '../data/public-content.service';
import { Billing, PlansCompareComponent } from '../plans-compare/plans-compare.component';

interface PlanBullet {
  text: string;
  included: boolean;
}

const START_BULLETS: PlanBullet[] = [
  { text: 'Облік доходів і витрат', included: true },
  { text: 'До 2 рахунків', included: true },
  { text: 'Бюджети за 5 категоріями', included: true },
  { text: '1 фінансова ціль', included: true },
  { text: 'Звіти за поточний місяць', included: true },
  { text: 'Експорт у CSV', included: false },
];

const PLUS_BULLETS: PlanBullet[] = [
  { text: 'Усе з тарифу Старт', included: true },
  { text: 'Необмежена кількість рахунків', included: true },
  { text: 'Бюджети за всіма категоріями', included: true },
  { text: 'Необмежені цілі з автовнесками', included: true },
  { text: 'Звіти й аналітика за будь-який період', included: true },
  { text: 'Експорт у CSV і пріоритетна підтримка', included: true },
];

@Component({
  selector: 'sb-plans-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    BadgeComponent,
    ButtonDirective,
    IconComponent,
    SableCardComponent,
    SegmentedComponent,
    PlansCompareComponent,
  ],
  templateUrl: './plans-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PlansPageComponent {
  protected readonly data = inject(PublicContentService).plans();

  protected readonly billingOptions: SegmentedOption[] = [
    { value: 'monthly', label: 'Щомісяця' },
    { value: 'yearly', label: 'Щороку · −20%' },
  ];
  protected readonly billingControl = new FormControl<Billing>('yearly', { nonNullable: true });
  protected readonly billing = toSignal(this.billingControl.valueChanges, { initialValue: 'yearly' as Billing });

  protected readonly startBullets = START_BULLETS;
  protected readonly plusBullets = PLUS_BULLETS;

  protected readonly start = computed(() => this.data().plans.find((plan) => plan.code === 'start'));
  protected readonly plus = computed(() => this.data().plans.find((plan) => plan.code === 'plus'));
  protected readonly yearly = computed(() => this.billing() === 'yearly');
  protected readonly startPrice = computed(() => formatPrice(this.start()?.priceMonthly ?? 0));
  protected readonly plusPrice = computed(() => {
    const plan = this.plus();
    if (!plan) {
      return '';
    }
    return formatPrice(this.yearly() ? plan.priceYearlyPerMonth : plan.priceMonthly);
  });
  protected readonly plusOldPrice = computed(() => formatPrice(this.plus()?.priceMonthly ?? 0));
}
