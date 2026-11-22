import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FieldComponent } from '../field/field.component';
import { IconComponent } from '../icon/icon.component';
import { uniqueId } from '../unique-id';

export interface SelectOption {
  value: string;
  label: string;
}

interface PanelPosition {
  top: number | null;
  bottom: number | null;
  left: number;
  width: number;
  maxHeight: number;
}

const PANEL_GAP = 6;
const PANEL_MAX_HEIGHT = 288;
const OPTION_HEIGHT = 44;
const PANEL_PADDING = 16;
const TYPE_AHEAD_RESET_MS = 600;

@Component({
  selector: 'sb-select',
  imports: [FieldComponent, IconComponent],
  templateUrl: './select.component.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true }],
  host: {
    class: 'select',
    '[class.select--compact]': 'compact()',
    '(document:mousedown)': 'onDocumentPress($event)',
    '(window:resize)': 'close()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SelectComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly options = input.required<SelectOption[]>();
  readonly placeholder = input<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
  readonly onSurface = input(false, { transform: booleanAttribute });
  readonly hideLabel = input(false, { transform: booleanAttribute });
  readonly compact = input(false, { transform: booleanAttribute });
  readonly variant = input<'default' | 'pill'>('default');

  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  protected readonly open = signal(false);
  protected readonly active = signal(0);
  protected readonly position = signal<PanelPosition>({ top: 0, bottom: null, left: 0, width: 0, maxHeight: PANEL_MAX_HEIGHT });
  protected readonly listId = uniqueId('sb-select-list');

  protected readonly items = computed<SelectOption[]>(() => {
    const placeholder = this.placeholder();
    return placeholder === undefined ? this.options() : [{ value: '', label: placeholder }, ...this.options()];
  });

  protected readonly selectedLabel = computed(() => {
    const value = this.value();
    if (value === '' && this.placeholder() !== undefined) {
      return null;
    }
    return this.items().find((option) => option.value === value)?.label ?? null;
  });

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private typeAhead = '';
  private typeAheadTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onScroll = (event: Event): void => {
    const panel = this.panel()?.nativeElement;
    if (panel && event.target instanceof Node && panel.contains(event.target)) {
      return;
    }
    this.close();
  };

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('scroll', this.onScroll, true);
      if (this.typeAheadTimer) {
        clearTimeout(this.typeAheadTimer);
      }
    });
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    if (isDisabled) {
      this.close();
    }
  }

  protected optionId(index: number): string {
    return `${this.listId}-${index}`;
  }

  protected toggle(): void {
    if (this.open()) {
      this.close(true);
    } else {
      this.openPanel();
    }
  }

  protected close(refocus = false): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    this.document.removeEventListener('scroll', this.onScroll, true);
    if (refocus) {
      this.trigger()?.nativeElement.focus();
    }
    this.onTouched();
  }

  protected choose(option: SelectOption): void {
    if (option.value !== this.value()) {
      this.value.set(option.value);
      this.onChange(option.value);
    }
    this.close(true);
  }

  protected onTriggerBlur(): void {
    if (!this.open()) {
      this.onTouched();
    }
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (this.open()) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.openPanel();
      return;
    }
    if (this.isCharacter(event)) {
      const current = this.items().findIndex((option) => option.value === this.value());
      const option = this.items()[this.matchTypeAhead(event.key, current)];
      if (option && option.value !== this.value()) {
        this.value.set(option.value);
        this.onChange(option.value);
      }
    }
  }

  protected onListKeydown(event: KeyboardEvent): void {
    const count = this.items().length;
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.close(true);
        return;
      case 'Tab':
        this.close();
        return;
      case 'ArrowDown':
        event.preventDefault();
        this.active.update((index) => Math.min(count - 1, index + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.active.update((index) => Math.max(0, index - 1));
        break;
      case 'Home':
        event.preventDefault();
        this.active.set(0);
        break;
      case 'End':
        event.preventDefault();
        this.active.set(count - 1);
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const option = this.items()[this.active()];
        if (option) {
          this.choose(option);
        }
        return;
      }
      default:
        if (!this.isCharacter(event)) {
          return;
        }
        this.active.set(this.matchTypeAhead(event.key, this.active()));
    }
    this.scrollActiveIntoView();
  }

  protected onDocumentPress(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  private openPanel(): void {
    if (this.disabled()) {
      return;
    }
    const control = this.trigger()?.nativeElement.closest<HTMLElement>('.field__control');
    if (!control) {
      return;
    }
    const selected = this.items().findIndex((option) => option.value === this.value());
    this.active.set(Math.max(0, selected));
    this.position.set(this.measure(control));
    this.open.set(true);
    this.document.addEventListener('scroll', this.onScroll, true);
    afterNextRender(
      () => {
        this.panel()?.nativeElement.focus({ preventScroll: true });
        this.scrollActiveIntoView();
      },
      { injector: this.injector },
    );
  }

  private measure(control: HTMLElement): PanelPosition {
    const viewportHeight = this.document.defaultView?.innerHeight ?? 800;
    const rect = control.getBoundingClientRect();
    const wanted = Math.min(PANEL_MAX_HEIGHT, this.items().length * OPTION_HEIGHT + PANEL_PADDING);
    const below = viewportHeight - rect.bottom - PANEL_GAP - 12;
    const above = rect.top - PANEL_GAP - 12;
    if (below >= wanted || below >= above) {
      return { top: rect.bottom + PANEL_GAP, bottom: null, left: rect.left, width: rect.width, maxHeight: Math.min(PANEL_MAX_HEIGHT, below) };
    }
    return {
      top: null,
      bottom: viewportHeight - rect.top + PANEL_GAP,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.min(PANEL_MAX_HEIGHT, above),
    };
  }

  private scrollActiveIntoView(): void {
    this.panel()?.nativeElement.querySelector<HTMLElement>('.select__option--active')?.scrollIntoView({ block: 'nearest' });
  }

  private isCharacter(event: KeyboardEvent): boolean {
    return event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey;
  }

  private matchTypeAhead(key: string, from: number): number {
    this.typeAhead += key.toLowerCase();
    if (this.typeAheadTimer) {
      clearTimeout(this.typeAheadTimer);
    }
    this.typeAheadTimer = setTimeout(() => (this.typeAhead = ''), TYPE_AHEAD_RESET_MS);
    const items = this.items();
    const repeated = this.typeAhead.split('').every((char) => char === this.typeAhead[0]);
    const needle = repeated ? this.typeAhead[0] : this.typeAhead;
    const start = repeated ? from + 1 : Math.max(0, from);
    for (let step = 0; step < items.length; step += 1) {
      const index = (start + step) % items.length;
      if (items[index].label.toLowerCase().startsWith(needle)) {
        return index;
      }
    }
    return from;
  }
}
