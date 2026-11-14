import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { FieldComponent } from '../field/field.component';
import { ModalComponent } from './modal.component';

@Component({
  imports: [ReactiveFormsModule, ModalComponent, FieldComponent],
  template: `
    <sb-modal [open]="open()" title="Вхід" (closed)="open.set(false)">
      <sb-field label="Пошта" [error]="control.touched && control.invalid ? 'Поле обов’язкове' : undefined">
        <input type="text" [formControl]="control" />
      </sb-field>
      <button modalFooter type="button" (click)="open.set(false)">Скасувати</button>
    </sb-modal>
  `,
})
class HostComponent {
  readonly open = signal(true);
  readonly control = new FormControl('', { nonNullable: true, validators: [Validators.required] });
}

describe('ModalComponent', () => {
  function setup(): { host: HostComponent; root: HTMLElement; detect: () => void } {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return { host: fixture.componentInstance, root: fixture.nativeElement as HTMLElement, detect: () => fixture.detectChanges() };
  }

  it('keeps focus in the field when the close button is pressed, so no error appears and the click closes the dialog', () => {
    const { host, root, detect } = setup();
    const close = root.querySelector<HTMLButtonElement>('[aria-label="Закрити"]') as HTMLButtonElement;
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    close.dispatchEvent(press);
    expect(press.defaultPrevented).toBe(true);
    close.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    close.click();
    detect();
    expect(host.open()).toBe(false);
    expect(root.textContent).not.toContain('Поле обов’язкове');
    expect(host.control.touched).toBe(false);
  });

  it('does the same for a footer button', () => {
    const { host, root } = setup();
    const cancel = [...root.querySelectorAll<HTMLButtonElement>('.modal__footer button')].find((button) => button.textContent?.includes('Скасувати')) as HTMLButtonElement;
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    cancel.dispatchEvent(press);
    expect(press.defaultPrevented).toBe(true);
    cancel.click();
    expect(host.open()).toBe(false);
  });

  it('still lets the mouse press reach text inside the body', () => {
    const { root } = setup();
    const input = root.querySelector('input') as HTMLInputElement;
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    input.dispatchEvent(press);
    expect(press.defaultPrevented).toBe(false);
  });
});
