import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ButtonDirective } from '../../shared/ui/button/button.directive';
import { IconButtonDirective } from '../../shared/ui/icon-button/icon-button.directive';
import { IconComponent } from '../../shared/ui/icon/icon.component';

interface FooterIconLink {
  icon: string;
  label: string;
  route?: string;
  fragment?: string;
  href?: string;
}

@Component({
  selector: 'sb-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonDirective, IconButtonDirective, IconComponent],
  templateUrl: './public-layout.component.html',
  host: { '(document:keydown.escape)': 'onEscape()', class: 'public-layout' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PublicLayoutComponent {
  protected readonly menuOpen = signal(false);
  protected readonly socialLinks: FooterIconLink[] = [
    { icon: 'message', label: 'Довідка', route: '/help' },
    { icon: 'mail', label: 'Написати на пошту', href: 'mailto:help@sable.ua' },
    { icon: 'play', label: 'Застосунок', route: '/', fragment: 'app' },
    { icon: 'phone', label: 'Контакти', route: '/about' },
    { icon: 'pin', label: 'Адреса', route: '/about' },
  ];

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

  constructor() {
    const destroyRef = inject(DestroyRef);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));

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
      destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
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

  private pathOf(url: string): string {
    return url.split(/[?#]/)[0] || '/';
  }
}
