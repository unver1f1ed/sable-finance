import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { AdminFeatureDto, AdminPlanDto } from '../../../core/models/admin';
import { AdminPlansPageComponent } from './admin-plans-page.component';

const PLANS: AdminPlanDto[] = [
  { id: 'p1', code: 'start', name: 'Sable Старт', description: 'Безкоштовно', priceMonthly: 0, priceYearlyPerMonth: 0, isPopular: false, isPublished: true, sortOrder: 1, userCount: 966 },
  { id: 'p2', code: 'plus', name: 'Sable Плюс', description: 'Повний набір', priceMonthly: 129, priceYearlyPerMonth: 103, isPopular: true, isPublished: true, sortOrder: 2, userCount: 318 },
];

const FEATURES: AdminFeatureDto[] = ['a', 'b', 'c'].map((id, index) => ({
  id,
  name: `Характеристика ${id}`,
  sortOrder: index + 1,
  values: { start: { kind: 'Included', text: null }, plus: { kind: 'Text', text: 'Без обмежень' } },
}));

function setup(): { fixture: ComponentFixture<AdminPlansPageComponent>; http: HttpTestingController; root: HTMLElement } {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(AdminPlansPageComponent);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne((req) => req.url.endsWith('/api/admin/plans')).flush(PLANS);
  http.expectOne((req) => req.url.endsWith('/api/admin/plan-features')).flush(FEATURES);
  fixture.detectChanges();
  return { fixture, http, root: fixture.nativeElement as HTMLElement };
}

function names(root: HTMLElement): string[] {
  return [...root.querySelectorAll('.features-admin__table tbody th')].map((cell) => cell.textContent?.trim() ?? '');
}

describe('AdminPlansPageComponent', () => {
  it('renders plan cards with the user counts and a row per feature', () => {
    const { root } = setup();
    const cards = root.querySelectorAll('.plans-admin__card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('966 користувачів');
    expect(cards[1].textContent).toContain('Популярний');
    expect(names(root)).toEqual(['Характеристика a', 'Характеристика b', 'Характеристика c']);
  });

  it('loads the selected plan into the form with the computed discount and a locked publish toggle for Старт', () => {
    const { fixture, root } = setup();
    expect(root.querySelector<HTMLInputElement>('.plans-admin__form sb-toggle input')?.disabled).toBe(true);
    expect(root.textContent).toContain('Тариф Старт завжди опублікований');
    root.querySelectorAll<HTMLButtonElement>('.plans-admin__card')[1].click();
    fixture.detectChanges();
    const locked = [...root.querySelectorAll<HTMLInputElement>('.plans-admin__form input:disabled')].map((input) => input.value);
    expect(locked).toContain('plus');
    expect(locked).toContain('20 %');
  });

  it('moves a feature down and sends every id in the new order', () => {
    const { fixture, http, root } = setup();
    root.querySelector<HTMLButtonElement>('[aria-label="Перемістити вниз: Характеристика a"]')?.click();
    fixture.detectChanges();
    expect(names(root)).toEqual(['Характеристика b', 'Характеристика a', 'Характеристика c']);
    const request = http.expectOne((req) => req.url.endsWith('/api/admin/plan-features/order'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ ids: ['b', 'a', 'c'] });
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('restores the previous order when saving the order fails', () => {
    const { fixture, http, root } = setup();
    root.querySelector<HTMLButtonElement>('[aria-label="Перемістити вгору: Характеристика c"]')?.click();
    fixture.detectChanges();
    expect(names(root)).toEqual(['Характеристика a', 'Характеристика c', 'Характеристика b']);
    http.expectOne((req) => req.url.endsWith('/order')).flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(names(root)).toEqual(['Характеристика a', 'Характеристика b', 'Характеристика c']);
  });

  it('disables the move buttons at the ends of the list', () => {
    const { root } = setup();
    expect(root.querySelector<HTMLButtonElement>('[aria-label="Перемістити вгору: Характеристика a"]')?.disabled).toBe(true);
    expect(root.querySelector<HTMLButtonElement>('[aria-label="Перемістити вниз: Характеристика c"]')?.disabled).toBe(true);
  });

  it('rejects a yearly price above the monthly one without sending the plan', () => {
    const { fixture, http, root } = setup();
    root.querySelectorAll<HTMLButtonElement>('.plans-admin__card')[1].click();
    fixture.detectChanges();
    const yearly = root.querySelectorAll<HTMLInputElement>('.plans-admin__form sb-amount-field input')[1];
    yearly.value = '150';
    yearly.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    root.querySelector('.plans-admin__form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(root.textContent).toContain('Ціна при оплаті за рік не може перевищувати місячну');
    http.expectNone((req) => req.method === 'PUT');
  });
});
