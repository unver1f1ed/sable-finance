import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { CategoryIconComponent } from '../../../shared/ui/category-icon/category-icon.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { AccountModalComponent } from '../accounts/account-modal.component';
import { ReferenceDataStore } from '../data/reference-data.store';

@Component({
  selector: 'sb-onboarding-card',
  imports: [AccountModalComponent, ButtonDirective, CategoryIconComponent, IconComponent],
  templateUrl: './onboarding-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class OnboardingCardComponent {
  protected readonly modalOpen = signal(false);
  private readonly store = inject(ReferenceDataStore);

  protected onSaved(): void {
    this.modalOpen.set(false);
    this.store.reloadAccounts();
  }
}
