import { ChangeDetectionStrategy, Component, ViewEncapsulation, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'sb-toggle',
  templateUrl: './toggle.component.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ToggleComponent), multi: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ToggleComponent implements ControlValueAccessor {
  readonly label = input.required<string>();

  protected readonly checked = signal(false);
  protected readonly disabled = signal(false);

  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: boolean | null): void {
    this.checked.set(!!value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected toggle(event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.checked.set(value);
    this.onChange(value);
  }

  protected touch(): void {
    this.onTouched();
  }
}
