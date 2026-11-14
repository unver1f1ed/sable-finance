import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { serverError } from '../../../core/forms/form-errors';
import { TransactionType } from '../../../core/models/finance';
import { toIsoDate } from '../../../shared/util/date';

const AMOUNT_LIMIT = 1_000_000_000;
export const MIN_DATE = '2000-01-01';

export type TransactionField = 'amount' | 'description' | 'categoryId' | 'accountId' | 'occurredOn' | 'note';

export function tomorrowIso(today: Date = new Date()): string {
  return toIsoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
}

function amountRule(control: AbstractControl): ValidationErrors | null {
  const value = control.value as number | null;
  if (value === null || value === undefined) {
    return { required: true };
  }
  if (value <= 0) {
    return { min: true };
  }
  if (value > AMOUNT_LIMIT) {
    return { max: true };
  }
  if (Math.round(value * 100) / 100 !== value) {
    return { decimals: true };
  }
  return null;
}

function dateRule(today: () => Date): ValidatorFn {
  return (control) => {
    const value = control.value as string;
    if (!value) {
      return { required: true };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { invalidDate: true };
    }
    if (value < MIN_DATE) {
      return { tooEarly: true };
    }
    if (value > tomorrowIso(today())) {
      return { tooLate: true };
    }
    return null;
  };
}

export function createTransactionForm(today: () => Date = () => new Date()): FormGroup {
  return new FormGroup({
    type: new FormControl<TransactionType>('Expense', { nonNullable: true }),
    amount: new FormControl<number | null>(null, { validators: [amountRule] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    accountId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    occurredOn: new FormControl(toIsoDate(today()), { nonNullable: true, validators: [dateRule(today)] }),
    goalId: new FormControl('', { nonNullable: true }),
    note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(300)] }),
  });
}

export function resetOnTypeChange(form: FormGroup): void {
  form.controls['categoryId'].setValue('');
  form.controls['goalId'].setValue('');
}

export function transactionFieldError(form: FormGroup, name: TransactionField): string | undefined {
  const control = form.controls[name];
  const server = serverError(control);
  if (server) {
    return server;
  }
  const errors = control.errors;
  if (!errors) {
    return undefined;
  }
  if (errors['required']) {
    return name === 'amount' ? 'Вкажіть суму' : 'Поле обов’язкове';
  }
  if (errors['min']) {
    return 'Сума має бути більшою за нуль';
  }
  if (errors['max']) {
    return 'Сума не може перевищувати 1 000 000 000';
  }
  if (errors['decimals']) {
    return 'Не більше двох цифр після коми';
  }
  if (errors['maxlength']) {
    return `Не більше ${(errors['maxlength'] as { requiredLength: number }).requiredLength} символів`;
  }
  if (errors['invalidDate']) {
    return 'Вкажіть коректну дату';
  }
  if (errors['tooEarly']) {
    return 'Дата не може бути раніше 2000 року';
  }
  if (errors['tooLate']) {
    return 'Дата не може бути пізнішою за завтрашню';
  }
  return 'Поле обов’язкове';
}
