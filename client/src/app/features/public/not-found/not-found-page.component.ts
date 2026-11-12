import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { SableCardComponent } from '../../../shared/ui/sable-card/sable-card.component';

@Component({
  selector: 'sb-not-found-page',
  imports: [RouterLink, ButtonDirective, SableCardComponent],
  templateUrl: './not-found-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class NotFoundPageComponent {}
