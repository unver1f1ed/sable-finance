import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthModalsComponent } from '../../features/auth/auth-modals.component';
import { AuthService } from '../../core/auth/auth.service';
import { ButtonDirective } from '../../shared/ui/button/button.directive';
import { IconButtonDirective } from '../../shared/ui/icon-button/icon-button.directive';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { NavDropdownComponent, NavDropdownItem } from '../../shared/ui/nav-dropdown/nav-dropdown.component';

const SCROLL_THRESHOLD = 8;

interface FooterIconLink {
  icon: string;
  label: string;
  route?: string;
  fragment?: string;
  href?: string;
}

@Component({
  selector: 'sb-public-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AuthModalsComponent,
    ButtonDirective,
    IconButtonDirective,
    IconComponent,
    NavDropdownComponent,
  ],
  templateUrl: './public-layout.component.html',
  host: { '(document:keydown.escape)': 'onEscape()', class: 'public-layout' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PublicLayoutComponent {
  protected readonly menuOpen = signal(false);
  protected readonly scrolled = signal(false);
  protected readonly featureLinks: NavDropdownItem[] = [
    { label: 'Облік і транзакції', route: '/', fragment: 'features' },
    { label: 'Бюджети', route: '/', fragment: 'budgets' },
    { label: 'Цілі', route: '/', fragment: 'goals' },
  ];
  protected readonly helpLinks: NavDropdownItem[] = [
    { label: 'Питання та відповіді', route: '/help' },
    { label: 'Про Sable', route: '/about' },
    { label: 'Контакти', route: '/about', fragment: 'contact' },
  ];
  protected readonly socialLinks: FooterIconLink[] = [
    { icon: 'message', label: 'Довідка', route: '/help' },
    { icon: 'mail', label: 'Написати на пошту', href: 'mailto:help@sable.ua' },
    { icon: 'play', label: 'Застосунок', route: '/', fragment: 'app' },
    { icon: 'phone', label: 'Контакти', route: '/about', fragment: 'contact' },
    { icon: 'pin', label: 'Адреса', route: '/about', fragment: 'contact' },
  ];

  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly burger = viewChild<ElementRef<HTMLButtonElement>>('burger');

  protected readonly path = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.pathOf(this.router.url)),
    ),
    { initialValue: this.pathOf(this.router.url) },
  );

  protected readonly helpActive = computed(() => this.path() === '/help' || this.path() === '/about');

  constructor() {
    const destroyRef = inject(DestroyRef);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.menuOpen.set(false);
        if (this.isBrowser) {
          setTimeout(() => this.syncScrolled());
        }
      });

    effect(() => {
      if (this.isBrowser) {
        this.document.body.classList.toggle('is-scroll-locked', this.menuOpen());
      }
    });

    afterNextRender(() => {
      const query = window.matchMedia('(min-width: 1024px)');
      const onChange = (event: MediaQueryListEvent): void => {
        if (event.matches) {
          this.menuOpen.set(false);
        }
      };
      query.addEventListener('change', onChange);
      const onScroll = (): void => this.syncScrolled();
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('scrollend', onScroll);
      window.addEventListener('pageshow', onScroll);
      destroyRef.onDestroy(() => {
        query.removeEventListener('change', onChange);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('scrollend', onScroll);
        window.removeEventListener('pageshow', onScroll);
      });
    });

    destroyRef.onDestroy(() => {
      if (this.isBrowser) {
        this.document.body.classList.remove('is-scroll-locked');
      }
    });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected onEscape(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      this.burger()?.nativeElement.focus();
    }
  }

  private syncScrolled(): void {
    this.scrolled.set(window.scrollY > SCROLL_THRESHOLD);
  }

  private pathOf(url: string): string {
    return url.split(/[?#]/)[0] || '/';
  }
}
