import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AvatarComponent } from '../../shared/ui/avatar/avatar.component';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { IconButtonDirective } from '../../shared/ui/icon-button/icon-button.directive';
import { IconComponent } from '../../shared/ui/icon/icon.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'sb-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AvatarComponent, BadgeComponent, IconButtonDirective, IconComponent],
  templateUrl: './admin-layout.component.html',
  host: { class: 'shell shell--admin' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AdminLayoutComponent {
  protected readonly navItems: NavItem[] = [
    { path: '/admin/users', label: 'Користувачі', icon: 'users' },
    { path: '/admin/plans', label: 'Тарифи', icon: 'layers' },
    { path: '/admin/reviews', label: 'Відгуки', icon: 'message' },
    { path: '/admin/faq', label: 'Довідка (FAQ)', icon: 'help' },
  ];

  protected readonly user = { name: 'Олена Коваль', email: 'admin@sable.ua' };
}
