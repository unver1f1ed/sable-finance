import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup } from '@angular/forms';
import { isApiError } from '../models/api-error';

export function applyServerErrors(form: FormGroup, error: unknown): boolean {
  const body: unknown = error instanceof HttpErrorResponse ? error.error : error;
  if (!isApiError(body) || !body.errors) {
    return false;
  }
  let matched = false;
  for (const [field, messages] of Object.entries(body.errors)) {
    const name = field.charAt(0).toLowerCase() + field.slice(1);
    const control = form.controls[name];
    if (control && messages.length > 0) {
      control.setErrors({ server: messages[0] });
      control.markAsTouched();
      matched = true;
    }
  }
  return matched;
}

export function serverError(control: AbstractControl | null): string | undefined {
  const message = control?.errors?.['server'] as string | undefined;
  return message;
}
