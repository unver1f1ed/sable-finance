import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ConfirmDialogComponent } from './confirm-dialog.component';

const LONG_WORD = 'Абвгдеєжзиіїйклмнопрстуфхцчшщьюя0123456789ABCDEFGHIJKLMNOPQRS';

@Component({
  imports: [ConfirmDialogComponent],
  template: `<sb-confirm-dialog
    [open]="true"
    title="Видалити відгук?"
    [message]="message"
    confirmLabel="Видалити"
    danger
    (confirm)="confirmed = true"
    (cancel)="cancelled = true"
  />`,
})
class HostComponent {
  readonly message = `Відгук від «${LONG_WORD}» буде видалено без можливості відновлення.`;
  confirmed = false;
  cancelled = false;
}

describe('ConfirmDialogComponent', () => {
  function setup(): { host: HostComponent; root: HTMLElement } {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return { host: fixture.componentInstance, root: fixture.nativeElement as HTMLElement };
  }

  it('prints a long unbroken name in a block that can wrap, with the full text intact', () => {
    const { root } = setup();
    const message = root.querySelector('.confirm p') as HTMLElement;
    expect(message.textContent).toContain(LONG_WORD);
    expect(message.closest('.modal__body')).not.toBeNull();
    expect(message.style.whiteSpace).toBe('');
  });

  it('keeps both actions in the footer and emits their events', () => {
    const { host, root } = setup();
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('.modal__footer button')];
    expect(buttons.map((button) => button.textContent?.trim())).toEqual(['Скасувати', 'Видалити']);
    buttons[1].click();
    buttons[0].click();
    expect(host.confirmed).toBe(true);
    expect(host.cancelled).toBe(true);
  });
});
