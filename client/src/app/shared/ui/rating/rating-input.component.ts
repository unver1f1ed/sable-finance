import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';
import { uniqueId } from '../unique-id';
import { nextRating } from './rating-logic';

@Component({
  selector: 'sb-rating-input',
  imports: [IconComponent],
  template: `
    <fieldset class="rating-input" [attr.aria-describedby]="describedBy()" [attr.aria-invalid]="invalid() ? 'true' : null">
      <legend class="rating-input__legend text-small text-muted">{{ label() }}</legend>
      <div class="rating-input__row">
        <div class="rating-input__stars">
          @for (star of stars; track star) {
            <label class="rating-input__star" [class.rating-input__star--on]="star <= value()">
              <input
                class="visually-hidden"
                type="radio"
                [name]="name"
                [value]="star"
                [checked]="value() === star"
                [disabled]="disabled()"
                [attr.aria-label]="star + ' із 5'"
                (change)="choose(star)"
                (keydown)="onKey($event)"
                (blur)="touched()"
              />
              <sb-icon name="star" [size]="28" />
            </label>
          }
        </div>
        <p class="text-body num" aria-live="polite">{{ text() }}</p>
      </div>
    </fieldset>
  `,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RatingInputComponent), multi: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class RatingInputComponent implements ControlValueAccessor {
  readonly label = input('Оцінка');
  readonly invalid = input(false);
  readonly describedBy = input<string>();

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly name = uniqueId('sb-rating-input');
  protected readonly value = signal(0);
  protected readonly disabled = signal(false);
  protected readonly text = computed(() => (this.value() > 0 ? `${this.value()} із 5` : ''));

  private onChange: (value: number) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: number | null): void {
    this.value.set(value ?? 0);
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected choose(star: number): void {
    this.value.set(star);
    this.onChange(star);
  }

  protected touched(): void {
    this.onTouched();
  }

  protected onKey(event: KeyboardEvent): void {
    const next = nextRating(this.value(), event.key);
    if (next === null) {
      return;
    }
    event.preventDefault();
    this.choose(next);
    const radios = (event.currentTarget as HTMLElement).closest('fieldset')?.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    radios?.[next - 1]?.focus();
  }
}
