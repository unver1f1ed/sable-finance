import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { AdminUserDto } from '../../../core/models/admin';
import { AdminUserModalComponent } from './admin-user-modal.component';

const USER: AdminUserDto = {
  id: 'u1',
  email: 'marta@example.com',
  firstName: 'Марта',
  lastName: 'Данильчук',
  role: 'User',
  planCode: 'start',
  isBlocked: false,
  createdAt: '2026-09-03T10:00:00Z',
  transactionCount: 4,
};

function setup(isSelf = false): { fixture: ComponentFixture<AdminUserModalComponent>; http: HttpTestingController; root: HTMLElement } {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(AdminUserModalComponent);
  fixture.componentRef.setInput('user', USER);
  fixture.componentRef.setInput('isSelf', isSelf);
  fixture.componentRef.setInput('planOptions', [
    { value: 'start', label: 'Старт' },
    { value: 'plus', label: 'Плюс' },
  ]);
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  return { fixture, http: TestBed.inject(HttpTestingController), root: fixture.nativeElement as HTMLElement };
}

describe('AdminUserModalComponent', () => {
  it('sends the edited names with the unchanged role, plan and block flag', () => {
    const { fixture, http, root } = setup();
    const first = root.querySelector<HTMLInputElement>('[formControlName="firstName"]') as HTMLInputElement;
    first.value = 'Марта-Софія';
    first.dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    const request = http.expectOne((req) => req.url.endsWith('/api/admin/users/u1'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ firstName: 'Марта-Софія', lastName: 'Данильчук', role: 'User', planCode: 'start', isBlocked: false });
  });

  it('does not send an empty first name', () => {
    const { fixture, http, root } = setup();
    const first = root.querySelector<HTMLInputElement>('[formControlName="firstName"]') as HTMLInputElement;
    first.value = '';
    first.dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    http.expectNone(() => true);
    expect(root.textContent).toContain('Поле обов’язкове');
  });

  it('locks role, block and delete for the own account and explains why', () => {
    const { root } = setup(true);
    expect(root.textContent).toContain('Не можна змінити власну роль, заблокувати чи видалити власний акаунт');
    const remove = [...root.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes('Видалити акаунт'));
    expect(remove?.disabled).toBe(true);
    expect(root.querySelector<HTMLInputElement>('sb-toggle input')?.disabled).toBe(true);
  });

  it('asks the page to confirm the deletion instead of deleting at once', () => {
    const { fixture, http, root } = setup();
    let requested: AdminUserDto | null = null;
    fixture.componentInstance.deleteRequested.subscribe((user) => (requested = user));
    [...root.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes('Видалити акаунт'))?.click();
    expect(requested).toEqual(USER);
    http.expectNone(() => true);
  });
});
