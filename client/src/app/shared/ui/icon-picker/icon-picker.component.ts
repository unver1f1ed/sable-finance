import { ChangeDetectionStrategy, Component, ViewEncapsulation, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CATEGORY_ICONS } from '../../../core/models/palette';
import { IconComponent } from '../icon/icon.component';
import { uniqueId } from '../unique-id';

@Component({
  selector: 'sb-icon-picker',
  imports: [IconComponent],
  templateUrl: './icon-picker.component.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => IconPickerComponent), multi: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class IconPickerComponent implements ControlValueAccessor {
  readonly label = input('Іконка');

  protected readonly options = CATEGORY_ICONS;
  protected readonly name = uniqueId('sb-icon-picker');
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
