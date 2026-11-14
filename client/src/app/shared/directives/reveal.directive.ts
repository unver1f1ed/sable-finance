import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, PLATFORM_ID, afterNextRender, inject, input, signal } from '@angular/core';
import { prefersReducedMotion } from './motion';

@Directive({
  selector: '[sbReveal]',
  host: {
    '[class.reveal]': 'armed()',
    '[class.reveal--in]': 'shown()',
    '[style.transition-delay.ms]': 'armed() ? delay() : null',
  },
})
export class RevealDirective {
  readonly delay = input(0, { alias: 'sbReveal', transform: (value: number | string) => Number(value) || 0 });

  protected readonly armed = signal(false);
  protected readonly shown = signal(false);

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    afterNextRender(() => this.init());
  }

  private init(): void {
    if (!this.isBrowser || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      return;
    }
    if (this.element.getBoundingClientRect().top < window.innerHeight * 0.9) {
      return;
    }
    this.armed.set(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.shown.set(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(this.element);
  }
}
