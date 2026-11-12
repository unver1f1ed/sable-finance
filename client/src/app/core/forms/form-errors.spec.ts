import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';
import { applyServerErrors } from './form-errors';

function problem(errors?: Record<string, string[]>): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 400,
    error: { type: 't', title: 'Validation', status: 400, detail: 'bad', code: 'validation_failed', errors },
  });
}

describe('applyServerErrors', () => {
  it('maps camelCase fields to matching controls', () => {
    const form = new FormGroup({ email: new FormControl(''), firstName: new FormControl('') });
    const matched = applyServerErrors(form, problem({ email: ['Вкажіть коректну адресу пошти'], unknown: ['x'] }));
    expect(matched).toBe(true);
    expect(form.controls['email'].errors).toEqual({ server: 'Вкажіть коректну адресу пошти' });
    expect(form.controls['firstName'].errors).toBeNull();
  });

  it('returns false when nothing matches', () => {
    const form = new FormGroup({ email: new FormControl('') });
    expect(applyServerErrors(form, problem({ other: ['x'] }))).toBe(false);
    expect(applyServerErrors(form, problem())).toBe(false);
    expect(applyServerErrors(form, new HttpErrorResponse({ status: 500 }))).toBe(false);
  });

  it('removes the server error when the value changes', () => {
    const form = new FormGroup({ email: new FormControl('a') });
    applyServerErrors(form, problem({ email: ['Помилка'] }));
    form.controls['email'].setValue('b');
    expect(form.controls['email'].errors).toBeNull();
  });
});
