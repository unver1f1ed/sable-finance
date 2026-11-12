import { createRegisterForm, registerFieldError } from './register-form';

function filled(overrides: Record<string, unknown> = {}) {
  const form = createRegisterForm();
  form.setValue({
    firstName: 'Богдан',
    lastName: 'Паславський',
    email: 'bohdan@example.com',
    password: 'Secret123',
    repeatPassword: 'Secret123',
    plan: 'start',
    terms: true,
    ...overrides,
  });
  return form;
}

describe('register form', () => {
  it('is valid with correct data', () => {
    expect(filled().valid).toBe(true);
  });

  it('reports mismatched passwords under the repeat field', () => {
    const form = filled({ repeatPassword: 'Secret124' });
    expect(form.invalid).toBe(true);
    expect(registerFieldError(form, 'repeatPassword')).toBe('Паролі не збігаються');
  });

  it.each(['short1', 'onlyletters', '12345678'])('rejects the password "%s" with the rule message', (password) => {
    const form = filled({ password, repeatPassword: password });
    expect(registerFieldError(form, 'password')).toBe('Пароль має містити щонайменше 8 символів, літери й цифри');
  });

  it('requires the terms and the names', () => {
    const form = filled({ terms: false, firstName: '' });
    expect(registerFieldError(form, 'terms')).toBe('Потрібно прийняти умови');
    expect(registerFieldError(form, 'firstName')).toBe('Поле обов’язкове');
  });

  it('rejects an invalid e-mail', () => {
    expect(registerFieldError(filled({ email: 'bohdan@' }), 'email')).toBe('Вкажіть коректну адресу пошти');
  });
});
