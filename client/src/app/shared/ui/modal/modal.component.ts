import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  effect,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { IconButtonDirective } from '../icon-button/icon-button.directive';
import { IconComponent } from '../icon/icon.component';
import { uniqueId } from '../unique-id';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

@Component({
  selector: 'sb-modal',
  imports: [IconButtonDirective, IconComponent],
  templateUrl: './modal.component.html',
  host: { '(document:keydown.escape)': 'onEscape()', '[attr.title]': 'null' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ModalComponent {
  readonly open = model(false);
  readonly title = input.required<string>();
  readonly width = input(520);
  readonly locked = input(false);
  readonly closed = output<void>();

  protected readonly titleId = uniqueId('sb-modal-title');

  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private previouslyFocused: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (!this.isBrowser) {
        return;
      }
      if (this.open()) {
        this.previouslyFocused = this.document.activeElement as HTMLElement | null;
        this.document.body.classList.add('is-scroll-locked');
        afterNextRender(() => this.focusDialog(), { injector: this.injector });
      } else {
        this.release();
      }
    });
    inject(DestroyRef).onDestroy(() => this.release());
  }

  protected close(): void {
    if (!this.open() || this.locked()) {
      return;
    }
    this.open.set(false);
    this.closed.emit();
  }

  protected onBackdropPress(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  protected keepFocus(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('button')) {
      event.preventDefault();
    }
  }

  protected onEscape(): void {
    this.close();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }
    const dialog = this.dialog()?.nativeElement;
    if (!dialog) {
      return;
    }
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = this.document.activeElement;
    if (event.shiftKey && (active === first || active === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusDialog(): void {
    const dialog = this.dialog()?.nativeElement;
    if (!dialog) {
      return;
    }
    const target = dialog.querySelector<HTMLElement>(`.modal__body :is(${FOCUSABLE})`) ?? dialog;
    target.focus();
  }

  private release(): void {
    if (!this.isBrowser) {
      return;
    }
    this.document.body.classList.remove('is-scroll-locked');
    if (this.previouslyFocused) {
      this.previouslyFocused.focus();
      this.previouslyFocused = null;
    }
  }
}
