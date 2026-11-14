import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, PLATFORM_ID, afterNextRender, inject, input } from '@angular/core';
import { isCoarsePointer, prefersReducedMotion } from './motion';

@Directive({ selector: '[sbParallax]' })
export class ParallaxDirective {
  readonly speed = input(0.12, { alias: 'sbParallax', transform: (value: number | string) => Number(value) || 0.12 });

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private frame = 0;

  constructor() {
    afterNextRender(() => this.init());
  }

  private init(): void {
    if (!this.isBrowser || prefersReducedMotion() || isCoarsePointer()) {
      return;
    }
    const update = (): void => {
      this.frame = 0;
      const offset = Math.min(window.scrollY, 600) * this.speed();
      this.element.style.setProperty('--parallax-y', `${offset.toFixed(1)}px`);
    };
    const onScroll = (): void => {
      if (!this.frame) {
        this.frame = requestAnimationFrame(update);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(this.frame);
    });
  }
}
