import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatCount, parseCount } from './count-up';
import { CountUpDirective } from './count-up.directive';
import { RevealDirective } from './reveal.directive';

@Component({
  imports: [CountUpDirective, RevealDirective],
  template: `
    <span class="count" [sbCountUp]="1000">400 000</span>
    <div class="reveal-target" [sbReveal]="80">Текст</div>
  `,
})
class HostComponent {}

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

let observerCallback: ObserverCallback | null = null;

function mockEnvironment(reduced: boolean): void {
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => callback());
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduced && query.includes('reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: ObserverCallback) {
        observerCallback = callback;
      }
      observe(): void {
        return;
      }
      disconnect(): void {
        return;
      }
    },
  );
}

describe('motion directives', () => {
  beforeEach(() => {
    observerCallback = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('keeps the final number and starts no animation under reduced motion', () => {
    mockEnvironment(true);
    const root = render();
    expect(root.querySelector('.count')?.textContent).toBe('400 000');
    expect(root.querySelector('.count')?.getAttribute('aria-label')).toBe('400 000');
    expect(root.querySelector('.reveal-target')?.classList.contains('reveal')).toBe(false);
  });

  it('counts up once visible and ends on the exact final text', () => {
    mockEnvironment(false);
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => callbacks.push(callback));
    const root = render();
    const count = root.querySelector('.count') as HTMLElement;
    expect(count.textContent).toBe('400 000');
    callbacks.length = 0;
    observerCallback?.([{ isIntersecting: true }]);
    expect(count.textContent).toBe('0');
    callbacks.shift()?.(0);
    callbacks.shift()?.(500);
    expect(Number(count.textContent?.replace(/\s/g, ''))).toBeGreaterThan(0);
    expect(Number(count.textContent?.replace(/\s/g, ''))).toBeLessThan(400000);
    callbacks.shift()?.(1200);
    expect(count.textContent).toBe('400 000');
    expect(count.getAttribute('aria-label')).toBe('400 000');
  });

  it('hides content below the fold only in the browser and shows it when it enters the viewport', () => {
    mockEnvironment(false);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 5000 } as DOMRect);
    const root = render();
    const target = root.querySelector('.reveal-target') as HTMLElement;
    expect(target.classList.contains('reveal')).toBe(true);
    expect(target.classList.contains('reveal--in')).toBe(false);
    expect(target.style.transitionDelay).toBe('80ms');
    observerCallback?.([{ isIntersecting: true }]);
    TestBed.tick();
    expect(target.classList.contains('reveal--in')).toBe(true);
  });

  it('does not animate elements that are already on screen', () => {
    mockEnvironment(false);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 10 } as DOMRect);
    const root = render();
    expect(root.querySelector('.reveal-target')?.classList.contains('reveal')).toBe(false);
  });
});

describe('count formatting', () => {
  it('parses and formats grouped integers and decimals', () => {
    const grouped = parseCount('400 000');
    expect(grouped?.value).toBe(400000);
    expect(grouped && formatCount(12345, grouped)).toBe('12 345');
    const decimal = parseCount('4.8');
    expect(decimal && formatCount(2.25, decimal)).toBe('2.3');
    const comma = parseCount('4,8');
    expect(comma && formatCount(3.1, comma)).toBe('3,1');
  });

  it('keeps a suffix after the number', () => {
    const plus = parseCount('400 000+');
    expect(plus?.value).toBe(400000);
    expect(plus && formatCount(1500, plus)).toBe('1 500+');
    const millions = parseCount('12 млн');
    expect(millions?.value).toBe(12);
    expect(millions && formatCount(7, millions)).toBe('7 млн');
  });

  it('ignores text that is not a number', () => {
    expect(parseCount('користувачів')).toBeNull();
    expect(parseCount('')).toBeNull();
  });
});
