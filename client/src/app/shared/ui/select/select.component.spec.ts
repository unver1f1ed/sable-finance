import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { beforeAll, describe, expect, it } from 'vitest';
import { SelectComponent, SelectOption } from './select.component';

const OPTIONS: SelectOption[] = [
  { value: 'food', label: 'Продукти' },
  { value: 'fuel', label: 'Пальне' },
  { value: 'cafe', label: 'Кафе' },
];

@Component({
  imports: [ReactiveFormsModule, SelectComponent],
  template: `<sb-select label="Категорія" [options]="options" [placeholder]="placeholder()" [formControl]="control" />
    <button id="outside" type="button">Поза списком</button>`,
})
class HostComponent {
  readonly options = OPTIONS;
  readonly placeholder = signal<string | undefined>(undefined);
  readonly control = new FormControl('', { nonNullable: true });
}

describe('SelectComponent', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = (): void => undefined;
  });

  function setup(): { host: HostComponent; root: HTMLElement; detect: () => void } {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return { host: fixture.componentInstance, root: fixture.nativeElement as HTMLElement, detect: () => fixture.detectChanges() };
  }

  const trigger = (root: HTMLElement): HTMLButtonElement => root.querySelector('.select__trigger') as HTMLButtonElement;
  const panel = (root: HTMLElement): HTMLElement | null => root.querySelector('[role="listbox"]');
  const options = (root: HTMLElement): HTMLElement[] => [...root.querySelectorAll<HTMLElement>('[role="option"]')];
  const key = (element: HTMLElement, name: string): void => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  };

  it('exposes a button with listbox semantics bound to the label', () => {
    const { root } = setup();
    const button = trigger(root);
    const label = root.querySelector('label') as HTMLLabelElement;
    expect(button.getAttribute('aria-haspopup')).toBe('listbox');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(label.htmlFor).toBe(button.id);
    expect(panel(root)).toBeNull();
  });

  it('opens on click, closes on a second click and reports aria-expanded', () => {
    const { root, detect } = setup();
    trigger(root).click();
    detect();
    expect(trigger(root).getAttribute('aria-expanded')).toBe('true');
    expect(options(root).map((option) => option.textContent?.trim())).toEqual(['Продукти', 'Пальне', 'Кафе']);
    trigger(root).click();
    detect();
    expect(panel(root)).toBeNull();
    expect(trigger(root).getAttribute('aria-expanded')).toBe('false');
  });

  it('writes the chosen value to the form control and shows its label', () => {
    const { host, root, detect } = setup();
    trigger(root).click();
    detect();
    options(root)[1].click();
    detect();
    expect(host.control.value).toBe('fuel');
    expect(trigger(root).textContent?.trim()).toBe('Пальне');
    expect(panel(root)).toBeNull();
  });

  it('marks the current option as selected', () => {
    const { host, root, detect } = setup();
    host.control.setValue('cafe');
    detect();
    trigger(root).click();
    detect();
    expect(options(root).map((option) => option.getAttribute('aria-selected'))).toEqual(['false', 'false', 'true']);
  });

  it('opens from the keyboard and selects with arrows and Enter', () => {
    const { host, root, detect } = setup();
    key(trigger(root), 'ArrowDown');
    detect();
    const list = panel(root) as HTMLElement;
    expect(list).not.toBeNull();
    key(list, 'ArrowDown');
    key(list, 'ArrowDown');
    detect();
    key(list, 'Enter');
    detect();
    expect(host.control.value).toBe('cafe');
    expect(panel(root)).toBeNull();
  });

  it('jumps with Home, End and the first letter', () => {
    const { host, root, detect } = setup();
    key(trigger(root), 'Enter');
    detect();
    const list = panel(root) as HTMLElement;
    key(list, 'End');
    detect();
    expect(list.querySelector('.select__option--active')?.textContent?.trim()).toBe('Кафе');
    key(list, 'Home');
    detect();
    expect(list.querySelector('.select__option--active')?.textContent?.trim()).toBe('Продукти');
    key(list, 'К');
    detect();
    key(list, 'Enter');
    detect();
    expect(host.control.value).toBe('cafe');
  });

  it('closes on Escape without changing the value, without letting the event reach the document', () => {
    const { host, root, detect } = setup();
    let reachedDocument = false;
    const spy = (): void => {
      reachedDocument = true;
    };
    key(trigger(root), ' ');
    detect();
    document.addEventListener('keydown', spy);
    key(panel(root) as HTMLElement, 'Escape');
    document.removeEventListener('keydown', spy);
    detect();
    expect(panel(root)).toBeNull();
    expect(host.control.value).toBe('');
    expect(reachedDocument).toBe(false);
  });

  it('closes on an outside press', () => {
    const { root, detect } = setup();
    trigger(root).click();
    detect();
    (root.querySelector('#outside') as HTMLElement).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    detect();
    expect(panel(root)).toBeNull();
  });

  it('adds the placeholder as an empty option and shows it while nothing is chosen', () => {
    const { host, root, detect } = setup();
    host.placeholder.set('Усі категорії');
    detect();
    expect(trigger(root).textContent?.trim()).toBe('Усі категорії');
    expect(trigger(root).querySelector('.select__value--placeholder')).not.toBeNull();
    trigger(root).click();
    detect();
    expect(options(root).map((option) => option.textContent?.trim())[0]).toBe('Усі категорії');
    options(root)[2].click();
    detect();
    trigger(root).click();
    detect();
    options(root)[0].click();
    detect();
    expect(host.control.value).toBe('');
  });

  it('does not open when disabled', () => {
    const { host, root, detect } = setup();
    host.control.disable();
    detect();
    expect(trigger(root).disabled).toBe(true);
    trigger(root).click();
    key(trigger(root), 'Enter');
    detect();
    expect(panel(root)).toBeNull();
  });
});
