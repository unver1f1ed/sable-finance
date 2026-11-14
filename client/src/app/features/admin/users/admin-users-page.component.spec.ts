import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it } from 'vitest';
import { AdminPlanDto, AdminUserDto } from '../../../core/models/admin';
import { AdminUsersPageComponent } from './admin-users-page.component';

const USER: AdminUserDto = {
  id: '01a1cfd3-2262-79e4-9a53-6f7a043eb44a',
  email: 'marta@example.com',
  firstName: 'Марта',
  lastName: 'Данильчук',
  role: 'User',
  planCode: 'plus',
  isBlocked: false,
  createdAt: '2026-09-03T10:00:00Z',
  transactionCount: 12,
};

const PLANS = [
  { id: 'p1', code: 'start', name: 'Sable Старт' },
  { id: 'p2', code: 'plus', name: 'Sable Плюс' },
] as AdminPlanDto[];

async function open(url: string): Promise<{ harness: RouterTestingHarness; http: HttpTestingController }> {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: 'admin/users', component: AdminUsersPageComponent }])],
  });
  const http = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url, AdminUsersPageComponent);
  return { harness, http };
}

function flushAll(http: HttpTestingController, items: AdminUserDto[]): void {
  http.expectOne((request) => request.url.endsWith('/api/admin/users') && request.method === 'GET').flush({ items, total: items.length, page: 1, pageSize: 20 });
  http.expectOne((request) => request.url.endsWith('/api/admin/users/stats')).flush({ total: 10, activeThisMonth: 7, onPlus: 2, blocked: 1 });
  http.expectOne((request) => request.url.endsWith('/api/admin/plans')).flush(PLANS);
}

describe('AdminUsersPageComponent', () => {
  it('renders a row per user with plan, role and status labels', async () => {
    const { harness, http } = await open('/admin/users');
    flushAll(http, [USER, { ...USER, id: 'b', email: 'x@example.com', isBlocked: true }]);
    harness.detectChanges();
    const rows = harness.routeNativeElement?.querySelectorAll('tbody tr') ?? [];
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Марта Данильчук');
    expect(rows[0].textContent).toContain('Плюс');
    expect(rows[0].textContent).toContain('03.09.2026');
    expect(rows[0].textContent).toContain('Активний');
    expect(rows[1].textContent).toContain('Заблоковано');
    expect(harness.routeNativeElement?.textContent).toContain('70% від усіх');
  });

  it('sends the filters from the URL with the list request', async () => {
    const { harness, http } = await open('/admin/users?role=Admin&status=blocked&page=2&search=mar');
    const request = http.expectOne((req) => req.url.endsWith('/api/admin/users') && req.method === 'GET');
    expect(request.request.params.get('role')).toBe('Admin');
    expect(request.request.params.get('status')).toBe('blocked');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('search')).toBe('mar');
    request.flush({ items: [], total: 0, page: 2, pageSize: 20 });
    http.expectOne((req) => req.url.endsWith('/stats')).flush({ total: 0, activeThisMonth: 0, onPlus: 0, blocked: 0 });
    http.expectOne((req) => req.url.endsWith('/api/admin/plans')).flush(PLANS);
    harness.detectChanges();
  });

  it('shows the empty state with a reset button that clears the URL filters', async () => {
    const { harness, http } = await open('/admin/users?role=Admin');
    http.expectOne((req) => req.url.endsWith('/api/admin/users') && req.method === 'GET').flush({ items: [], total: 0, page: 1, pageSize: 20 });
    http.expectOne((req) => req.url.endsWith('/stats')).flush({ total: 0, activeThisMonth: 0, onPlus: 0, blocked: 0 });
    http.expectOne((req) => req.url.endsWith('/api/admin/plans')).flush(PLANS);
    harness.detectChanges();
    const reset = [...(harness.routeNativeElement?.querySelectorAll('button') ?? [])].find((button) => button.textContent?.includes('Скинути фільтри'));
    expect(reset).toBeTruthy();
    reset?.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/admin/users');
    http.match(() => true);
  });

  it('shows an error state with retry when the list fails', async () => {
    const { harness, http } = await open('/admin/users');
    http.expectOne((req) => req.url.endsWith('/api/admin/users') && req.method === 'GET').flush({}, { status: 500, statusText: 'Server Error' });
    http.expectOne((req) => req.url.endsWith('/stats')).flush({}, { status: 500, statusText: 'Server Error' });
    http.expectOne((req) => req.url.endsWith('/api/admin/plans')).flush(PLANS);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Не вдалося завантажити дані');
  });
});
