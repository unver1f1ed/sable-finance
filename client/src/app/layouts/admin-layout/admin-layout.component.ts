import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ViewEncapsulation, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
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

  protected readonly auth = inject(AuthService);
  protected readonly fullName = computed(() => {
    const user = this.auth.user();
    return user ? `${user.firstName} ${user.lastName}`.trim() : '';
  });

  private readonly document = inject(DOCUMENT);

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.revealActiveTab());
  }

  // The tab strip scrolls sideways on phones: bring the current section into view after the active class is applied.
  private revealActiveTab(): void {
    setTimeout(() => this.document.querySelector('.admin-tabs__link--active')?.scrollIntoView({ inline: 'nearest', block: 'nearest' }));
  }
}
