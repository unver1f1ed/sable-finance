import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, PLATFORM_ID, afterNextRender, inject, input } from '@angular/core';
import { CountSpec, easeOutCubic, formatCount, parseCount } from './count-up';
import { prefersReducedMotion, whenIdle } from './motion';

@Directive({ selector: '[sbCountUp]' })
export class CountUpDirective {
  readonly duration = input(1400, { alias: 'sbCountUp', transform: (value: number | string) => Number(value) || 1400 });

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    afterNextRender(() => whenIdle(() => this.init()));
  }

  private init(): void {
    if (!this.isBrowser) {
      return;
    }
    const spec = parseCount(this.element.textContent ?? '');
    if (!spec) {
      return;
    }
    this.element.setAttribute('aria-label', spec.text);
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        const current = parseCount(this.element.textContent ?? '') ?? spec;
        this.element.setAttribute('aria-label', current.text);
        this.run(current);
      }
    });
    observer.observe(this.element);
  }

  private run(spec: CountSpec): void {
    const total = this.duration();
    let start: number | null = null;
    const step = (time: number): void => {
      start ??= time;
      const progress = (time - start) / total;
      if (progress >= 1) {
        this.element.textContent = spec.text;
        return;
      }
      this.element.textContent = formatCount(spec.value * easeOutCubic(progress), spec);
      requestAnimationFrame(step);
    };
    this.element.textContent = formatCount(0, spec);
    requestAnimationFrame(step);
  }
}
