import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { AdminReviewDto } from '../../../core/models/admin';
import { ReviewModalComponent } from './review-modal.component';

function setup(review: AdminReviewDto | null = null): { fixture: ComponentFixture<ReviewModalComponent>; http: HttpTestingController; root: HTMLElement } {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(ReviewModalComponent);
  fixture.componentRef.setInput('review', review);
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  return { fixture, http: TestBed.inject(HttpTestingController), root: fixture.nativeElement as HTMLElement };
}

function type(root: HTMLElement, selector: string, value: string): void {
  const element = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (!element) {
    throw new Error(`Missing ${selector}`);
  }
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function submit(fixture: ComponentFixture<ReviewModalComponent>, root: HTMLElement): void {
  root.querySelector('form')?.dispatchEvent(new Event('submit'));
  fixture.detectChanges();
}

describe('ReviewModalComponent', () => {
  it('shows the validation messages and sends nothing for an empty form', () => {
    const { fixture, http, root } = setup();
    submit(fixture, root);
    const text = root.textContent ?? '';
    expect(text).toContain('Вкажіть ім’я автора');
    expect(text).toContain('Оберіть оцінку');
    expect(text).toContain('Щонайменше 10 символів');
    http.expectNone(() => true);
  });

  it('counts the characters of the text', () => {
    const { fixture, root } = setup();
    type(root, 'textarea', 'Дуже зручно');
    fixture.detectChanges();
    expect(root.textContent).toContain('11 / 280 символів');
  });

  it('creates a review with the entered data', () => {
    const { fixture, http, root } = setup();
    type(root, '[formControlName="author"]', ' Марта Д. ');
    root.querySelectorAll<HTMLInputElement>('sb-rating-input input')[3].click();
    type(root, 'textarea', 'Дуже зручно вести бюджет');
    fixture.detectChanges();
    submit(fixture, root);
    const request = http.expectOne((req) => req.url.endsWith('/api/admin/reviews'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ author: 'Марта Д.', rating: 4, text: 'Дуже зручно вести бюджет', isPublished: true });
  });

  it('updates an existing review', () => {
    const review: AdminReviewDto = { id: 'r1', author: 'Іван', text: 'Нормальний сервіс для обліку', rating: 3, isPublished: false, createdAt: '2026-11-01T00:00:00Z' };
    const { fixture, http, root } = setup(review);
    type(root, '[formControlName="author"]', 'Іван К.');
    fixture.detectChanges();
    submit(fixture, root);
    const request = http.expectOne((req) => req.url.endsWith('/api/admin/reviews/r1'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ author: 'Іван К.', rating: 3, text: 'Нормальний сервіс для обліку', isPublished: false });
  });
});
