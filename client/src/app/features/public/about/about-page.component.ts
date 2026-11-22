import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CountUpDirective } from '../../../shared/directives/count-up.directive';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { CategoryIconComponent } from '../../../shared/ui/category-icon/category-icon.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { SableCardComponent } from '../../../shared/ui/sable-card/sable-card.component';
import { ContactFormComponent } from './contact-form.component';

interface Stat {
  value: string;
  text: string;
}

interface Principle {
  icon: string;
  title: string;
  text: string;
}

@Component({
  selector: 'sb-about-page',
  imports: [RouterLink, ButtonDirective, CategoryIconComponent, CountUpDirective, IconComponent, RevealDirective, SableCardComponent, ContactFormComponent],
  templateUrl: './about-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AboutPageComponent {
  protected readonly stats: Stat[] = [
    { value: '400 000+', text: 'користувачів планують бюджет із Sable' },
    { value: '12 млн', text: 'транзакцій записано за останній рік' },
    { value: '4.8', text: 'середня оцінка в магазинах застосунків' },
  ];

  protected readonly principles: Principle[] = [
    {
      icon: 'eye',
      title: 'Прозорість',
      text: 'Жодних прихованих платежів і дрібного шрифту. Ви завжди бачите, що і чому відбувається з вашими даними.',
    },
    {
      icon: 'target',
      title: 'Фокус на цілях',
      text: 'Облік є лише початком. Кожен екран підказує, наскільки ви близькі до того, заради чого відкладаєте.',
    },
    {
      icon: 'shield',
      title: 'Безпека даних',
      text: 'Паролі зберігаються лише у хешованому вигляді, а доступ до кабінету захищено на рівні сервера.',
    },
  ];
}
