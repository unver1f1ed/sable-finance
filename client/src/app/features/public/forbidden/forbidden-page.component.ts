import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { SableCardComponent } from '../../../shared/ui/sable-card/sable-card.component';

@Component({
  selector: 'sb-forbidden-page',
  imports: [RouterLink, ButtonDirective, SableCardComponent],
  templateUrl: './forbidden-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ForbiddenPageComponent {
  protected readonly auth = inject(AuthService);
}
