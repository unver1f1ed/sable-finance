import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FieldComponent } from '../field/field.component';
import { IconComponent } from '../icon/icon.component';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'sb-select',
  imports: [FieldComponent, IconComponent],
  templateUrl: './select.component.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true }],
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
  readonly variant = input<'default' | 'pill'>('default');

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

  protected change(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.value.set(value);
    this.onChange(value);
  }

  protected touch(): void {
    this.onTouched();
  }
}
