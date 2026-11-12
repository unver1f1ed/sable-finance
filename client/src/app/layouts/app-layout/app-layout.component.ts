import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AvatarComponent } from '../../shared/ui/avatar/avatar.component';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { ButtonDirective } from '../../shared/ui/button/button.directive';
import { IconButtonDirective } from '../../shared/ui/icon-button/icon-button.directive';
import { IconComponent } from '../../shared/ui/icon/icon.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  exact: boolean;
}

@Component({
  selector: 'sb-app-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AvatarComponent,
    BadgeComponent,
    ButtonDirective,
    IconButtonDirective,
    IconComponent,
  ],
  templateUrl: './app-layout.component.html',
  host: { class: 'shell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AppLayoutComponent {
  protected readonly navItems: NavItem[] = [
    { path: '/app', label: 'Огляд', icon: 'grid', exact: true },
    { path: '/app/transactions', label: 'Транзакції', icon: 'swap', exact: false },
    { path: '/app/planning', label: 'Планування', icon: 'target', exact: false },
    { path: '/app/settings', label: 'Налаштування', icon: 'sliders', exact: false },
  ];

  protected readonly auth = inject(AuthService);
  protected readonly fullName = computed(() => {
    const user = this.auth.user();
    return user ? `${user.firstName} ${user.lastName}`.trim() : '';
  });
  protected readonly isPlus = computed(() => this.auth.planCode() === 'plus');
  protected readonly planLabel = computed(() => (this.isPlus() ? 'Плюс' : 'Старт'));
}
