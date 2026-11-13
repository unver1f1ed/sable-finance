import { createTransactionForm, resetOnTypeChange, tomorrowIso, transactionFieldError } from './transaction-form';

const TODAY = new Date(2026, 10, 11);

function form() {
  const result = createTransactionForm(() => TODAY);
  result.patchValue({ amount: 100, description: 'Bolt', categoryId: 'c1', accountId: 'a1', occurredOn: '2026-11-11' });
  return result;
}

describe('transaction form', () => {
  it('is valid with correct data', () => {
    expect(form().valid).toBe(true);
  });

  it('rejects empty, zero, negative and oversized amounts', () => {
    const f = form();
    f.controls['amount'].setValue(null);
    expect(transactionFieldError(f, 'amount')).toBe('Вкажіть суму');
    f.controls['amount'].setValue(0);
    expect(transactionFieldError(f, 'amount')).toBe('Сума має бути більшою за нуль');
    f.controls['amount'].setValue(-5);
    expect(transactionFieldError(f, 'amount')).toBe('Сума має бути більшою за нуль');
    f.controls['amount'].setValue(1_000_000_001);
    expect(transactionFieldError(f, 'amount')).toBe('Сума не може перевищувати 1 000 000 000');
    f.controls['amount'].setValue(12.345);
    expect(transactionFieldError(f, 'amount')).toBe('Не більше двох цифр після коми');
    f.controls['amount'].setValue(999999999.99);
    expect(f.controls['amount'].valid).toBe(true);
  });

  it('validates the description and note length', () => {
    const f = form();
    f.controls['description'].setValue('x'.repeat(121));
    expect(transactionFieldError(f, 'description')).toBe('Не більше 120 символів');
    f.controls['description'].setValue('');
    expect(transactionFieldError(f, 'description')).toBe('Поле обов’язкове');
    f.controls['note'].setValue('x'.repeat(301));
    expect(transactionFieldError(f, 'note')).toBe('Не більше 300 символів');
  });

  it('allows tomorrow but not later and not before 2000', () => {
    const f = form();
    f.controls['occurredOn'].setValue(tomorrowIso(TODAY));
    expect(f.controls['occurredOn'].valid).toBe(true);
    f.controls['occurredOn'].setValue('2026-11-13');
    expect(transactionFieldError(f, 'occurredOn')).toBe('Дата не може бути пізнішою за завтрашню');
    f.controls['occurredOn'].setValue('1999-12-31');
    expect(transactionFieldError(f, 'occurredOn')).toBe('Дата не може бути раніше 2000 року');
  });

  it('clears the category and goal when the type changes', () => {
    const f = form();
    f.controls['goalId'].setValue('g1');
    resetOnTypeChange(f);
    expect(f.controls['categoryId'].value).toBe('');
    expect(f.controls['goalId'].value).toBe('');
  });
});
