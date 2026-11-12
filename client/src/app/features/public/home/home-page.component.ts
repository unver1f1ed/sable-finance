import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PublicContentService } from '../data/public-content.service';
import { PlansCompareComponent } from '../plans-compare/plans-compare.component';
import { ReviewsSliderComponent } from './reviews-slider.component';

interface Benefit {
  icon: string;
  title: string;
  text: string;
}

interface Step {
  title: string;
  text: string;
}

@Component({
  selector: 'sb-home-page',
  imports: [RouterLink, ButtonDirective, IconComponent, PlansCompareComponent, ReviewsSliderComponent],
  templateUrl: './home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class HomePageComponent {
  private readonly content = inject(PublicContentService);

  protected readonly plans = this.content.plans();
  protected readonly reviews = this.content.reviews();
  protected readonly stars = [1, 2, 3, 4, 5];

  protected readonly benefits: Benefit[] = [
    {
      icon: 'card',
      title: 'Усі рахунки в одному місці за 5 хвилин.',
      text: 'Картки, готівка й заощадження — без прив’язки банку та зайвих анкет.',
    },
    {
      icon: 'star',
      title: 'Бюджет, який справді працює.',
      text: 'Ліміти за категоріями, попередження про перевитрати та залишок на кожен день.',
    },
    {
      icon: 'check',
      title: 'Формуйте корисні звички',
      text: 'Ми віримо в маленькі регулярні кроки. Плануйте витрати наперед разом із Sable.',
    },
    {
      icon: 'target',
      title: 'Цілі з видимим прогресом.',
      text: 'Відкладайте на відпустку чи подушку безпеки й бачте, скільки лишилось до мети.',
    },
  ];

  protected readonly steps: Step[] = [
    {
      title: 'Тримайте витрати під контролем',
      text: 'Встановіть місячні ліміти за категоріями — Sable підкаже, коли ви наближаєтесь до межі, і покаже, скільки можна витрачати щодня.',
    },
    {
      title: 'Відкладайте на важливе',
      text: 'Створюйте цілі з терміном і сумою. Сервіс порахує, скільки вносити щомісяця, щоб устигнути.',
    },
    {
      title: 'Допомога від живих людей',
      text: 'Якщо виникли питання про фінанси чи сервіс, підтримка відповість у чаті, поштою або в розділі довідки.',
    },
  ];
}
