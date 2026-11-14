import { ChangeDetectionStrategy, Component, ElementRef, ViewEncapsulation, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';
import { uniqueId } from '../unique-id';

export interface NavDropdownItem {
  label: string;
  route: string;
  fragment?: string;
}

@Component({
  selector: 'sb-nav-dropdown',
  imports: [RouterLink, IconComponent],
  template: `
    <button
      #toggle
      class="public-nav__link nav-dropdown__toggle"
      [class.public-nav__link--active]="active()"
      type="button"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="open() ? listId : null"
      (click)="toggleMenu()"
    >
      {{ label() }}
      <sb-icon class="nav-dropdown__chevron" [class.nav-dropdown__chevron--open]="open()" name="chev-down" [size]="14" />
    </button>
    @if (open()) {
      <ul class="nav-dropdown__list" [id]="listId">
        @for (item of items(); track item.label) {
          <li>
            <a class="nav-dropdown__item" [routerLink]="item.route" [fragment]="item.fragment" (click)="close()">{{ item.label }}</a>
          </li>
        }
      </ul>
    }
  `,
  host: {
    class: 'nav-dropdown',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'onEscape()',
    '(focusout)': 'onFocusOut($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class NavDropdownComponent {
  readonly label = input.required<string>();
  readonly items = input.required<NavDropdownItem[]>();
  readonly active = input(false);

  protected readonly open = signal(false);
  protected readonly listId = uniqueId('sb-nav-dropdown');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly toggle = viewChild<ElementRef<HTMLButtonElement>>('toggle');

  protected toggleMenu(): void {
    this.open.update((value) => !value);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected onEscape(): void {
    if (this.open()) {
      this.open.set(false);
      this.toggle()?.nativeElement.focus();
    }
  }

  protected onDocumentClick(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (this.open() && next && !this.host.nativeElement.contains(next)) {
      this.open.set(false);
    }
  }
}
