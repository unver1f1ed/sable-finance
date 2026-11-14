import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { serverError } from '../../core/forms/form-errors';
import { PlanCode } from '../../core/models/auth';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_RULE_MESSAGE = 'Пароль має містити щонайменше 8 символів, літери й цифри';
export const REQUIRED_MESSAGE = 'Поле обов’язкове';
export const EMAIL_MESSAGE = 'Вкажіть коректну адресу пошти';
export const MISMATCH_MESSAGE = 'Паролі не збігаються';
const TERMS_MESSAGE = 'Потрібно прийняти умови';

export type RegisterField = 'firstName' | 'lastName' | 'email' | 'password' | 'repeatPassword' | 'plan' | 'terms';

export function passwordRule(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (!value) {
    return null;
  }
  const valid = value.length >= 8 && /\p{L}/u.test(value) && /\d/.test(value);
  return valid ? null : { passwordRule: true };
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value as string | undefined;
  const repeat = group.get('repeatPassword')?.value as string | undefined;
  return repeat && password !== repeat ? { mismatch: true } : null;
}

export function createRegisterForm(): FormGroup {
  return new FormGroup(
    {
      firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
      lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(EMAIL_PATTERN), Validators.maxLength(120)],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, passwordRule, Validators.maxLength(100)],
      }),
      repeatPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      plan: new FormControl<PlanCode>('start', { nonNullable: true }),
      terms: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
    },
    { validators: [passwordsMatch] },
  );
}

export function registerFieldError(form: FormGroup, name: RegisterField): string | undefined {
  const control = form.controls[name];
  const server = serverError(control);
  if (server) {
    return server;
  }
  if (name === 'repeatPassword' && !control.errors && form.errors?.['mismatch']) {
    return MISMATCH_MESSAGE;
  }
  const errors = control.errors;
  if (!errors) {
    return undefined;
  }
  if (errors['required']) {
    return name === 'terms' ? TERMS_MESSAGE : REQUIRED_MESSAGE;
  }
  if (errors['pattern']) {
    return EMAIL_MESSAGE;
  }
  if (errors['passwordRule']) {
    return PASSWORD_RULE_MESSAGE;
  }
  if (errors['maxlength']) {
    return `Не більше ${(errors['maxlength'] as { requiredLength: number }).requiredLength} символів`;
  }
  return REQUIRED_MESSAGE;
}

export function passwordStrength(value: string): number {
  if (!value) {
    return 0;
  }
  let score = 0;
  if (value.length >= 8) {
    score += 1;
  }
  if (/\p{L}/u.test(value) && /\d/.test(value)) {
    score += 1;
  }
  if (value.length >= 12) {
    score += 1;
  }
  if (/[^\p{L}\d]/u.test(value) && /\p{Lu}/u.test(value)) {
    score += 1;
  }
  return score;
}
