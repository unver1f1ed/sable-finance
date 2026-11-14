import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { CountUpDirective } from '../../../shared/directives/count-up.directive';
import { ParallaxDirective } from '../../../shared/directives/parallax.directive';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { PublicContentService } from '../data/public-content.service';
import { PlansCompareComponent } from '../plans-compare/plans-compare.component';
import { ReviewsSliderComponent } from './reviews-slider.component';

interface Benefit {
  icon: string;
  title: string;
  text: string;
}

interface Brand {
  src: string;
  alt: string;
  width?: number;
}

interface Step {
  title: string;
  text: string;
}

@Component({
  selector: 'sb-home-page',
  imports: [RouterLink, ButtonDirective, CountUpDirective, IconComponent, ParallaxDirective, PlansCompareComponent, RevealDirective, ReviewsSliderComponent],
  templateUrl: './home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class HomePageComponent {
  private readonly content = inject(PublicContentService);

  protected readonly plans = this.content.plans();
  protected readonly reviews = this.content.reviews();
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly pressCopies = [0, 1];
  protected readonly averageText = computed(() => String(this.reviews().average));

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

  protected readonly press: Brand[] = [
    { src: '/images/brands/yahoo.svg', alt: 'Логотип Yahoo', width: 124 },
    { src: '/images/brands/bloomberg.svg', alt: 'Логотип Bloomberg', width: 243 },
    { src: '/images/brands/insider.svg', alt: 'Логотип Insider', width: 147 },
    { src: '/images/brands/forbes.svg', alt: 'Логотип Forbes', width: 118 },
    { src: '/images/brands/yahoo.svg', alt: 'Логотип Yahoo', width: 124 },
  ];

  protected readonly tilesFirst: Brand[] = [
    { src: '/images/brands/wholefoods.svg', alt: 'Логотип Whole Foods' },
    { src: '/images/brands/spotify.svg', alt: 'Логотип Spotify' },
    { src: '/images/brands/amazon.svg', alt: 'Логотип Amazon' },
    { src: '/images/brands/uber.svg', alt: 'Логотип Uber' },
  ];

  protected readonly tilesSecond: Brand[] = [
    { src: '/images/brands/netflix.svg', alt: 'Логотип Netflix' },
    { src: '/images/brands/ubereats.svg', alt: 'Логотип Uber Eats' },
    { src: '/images/brands/uber.svg', alt: 'Логотип Uber' },
    { src: '/images/brands/spotify.svg', alt: 'Логотип Spotify' },
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
