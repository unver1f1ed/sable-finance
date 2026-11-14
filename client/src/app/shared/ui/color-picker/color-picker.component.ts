import { ChangeDetectionStrategy, Component, ViewEncapsulation, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CATEGORY_COLORS } from '../../../core/models/palette';
import { uniqueId } from '../unique-id';

@Component({
  selector: 'sb-color-picker',
  templateUrl: './color-picker.component.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ColorPickerComponent), multi: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ColorPickerComponent implements ControlValueAccessor {
  readonly label = input('Колір');

  protected readonly options = CATEGORY_COLORS;
  protected readonly name = uniqueId('sb-color-picker');
  protected readonly value = signal('');
  protected readonly disabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

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
  }

  protected select(value: string): void {
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
  }
}
