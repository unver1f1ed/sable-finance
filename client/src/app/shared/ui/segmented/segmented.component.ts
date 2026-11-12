import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  booleanAttribute,
  forwardRef,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SegmentedOption {
  value: string;
  label: string;
}

@Component({
  selector: 'sb-segmented',
  templateUrl: './segmented.component.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SegmentedComponent), multi: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SegmentedComponent implements ControlValueAccessor {
  readonly options = input.required<SegmentedOption[]>();
  readonly block = input(false, { transform: booleanAttribute });
  readonly onSurface = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input<string>();

  protected readonly value = signal<string | null>(null);
  protected readonly disabled = signal(false);

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('optionButton');
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected isTabStop(index: number): boolean {
    const selected = this.options().findIndex((option) => option.value === this.value());
    return index === (selected === -1 ? 0 : selected);
  }

  protected select(option: SegmentedOption): void {
    this.value.set(option.value);
    this.onChange(option.value);
    this.onTouched();
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const count = this.options().length;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (index + 1) % count;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (index - 1 + count) % count;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.select(this.options()[next]);
    this.buttons()[next]?.nativeElement.focus();
  }
}
