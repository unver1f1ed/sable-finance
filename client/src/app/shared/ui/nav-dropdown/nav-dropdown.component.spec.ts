import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { NavDropdownComponent } from './nav-dropdown.component';

function setup(): { fixture: ComponentFixture<NavDropdownComponent>; root: HTMLElement; toggle: HTMLButtonElement } {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(NavDropdownComponent);
  fixture.componentRef.setInput('label', 'Довідка');
  fixture.componentRef.setInput('items', [
    { label: 'Питання та відповіді', route: '/help' },
    { label: 'Про Sable', route: '/about' },
  ]);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  return { fixture, root, toggle: root.querySelector('button') as HTMLButtonElement };
}

describe('NavDropdownComponent', () => {
  it('opens and closes with the toggle and reports the state', () => {
    const { fixture, root, toggle } = setup();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelectorAll('a').length).toBe(2);
    toggle.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('a').length).toBe(0);
  });

  it('closes on Escape and returns focus to the toggle', () => {
    const { fixture, root, toggle } = setup();
    toggle.click();
    fixture.detectChanges();
    root.querySelector('a')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on a click outside', () => {
    const { fixture, toggle } = setup();
    toggle.click();
    fixture.detectChanges();
    document.body.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes when focus leaves the menu', () => {
    const { fixture, toggle } = setup();
    toggle.click();
    fixture.detectChanges();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    toggle.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    outside.remove();
  });
});
