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
import { amountToText, parseAmount, sanitizeAmount } from '../../util/amount';
import { FieldComponent } from '../field/field.component';
import { IconComponent } from '../icon/icon.component';
import { uniqueId } from '../unique-id';

@Component({
  selector: 'sb-amount-field',
  imports: [FieldComponent, IconComponent],
  templateUrl: './amount-field.component.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AmountFieldComponent), multi: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AmountFieldComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
  readonly onSurface = input(false, { transform: booleanAttribute });
  readonly allowNegative = input(false, { transform: booleanAttribute });
  readonly variant = input<'field' | 'hero'>('field');
  readonly placeholder = input('0,00');

  protected readonly text = signal('');
  protected readonly disabled = signal(false);
  protected readonly inputId = uniqueId('sb-amount');
  protected readonly messageId = uniqueId('sb-amount-msg');

  private onChange: (value: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: number | null): void {
    this.text.set(amountToText(value));
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected input(event: Event): void {
    const element = event.target as HTMLInputElement;
    const sanitized = sanitizeAmount(element.value, this.allowNegative());
    if (sanitized !== element.value) {
      element.value = sanitized;
    }
    this.text.set(sanitized);
    this.onChange(parseAmount(sanitized));
  }

  protected touch(): void {
    this.onTouched();
  }
}
