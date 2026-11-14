import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it } from 'vitest';
import { AdminReviewDto } from '../../../core/models/admin';
import { AdminReviewsPageComponent } from './admin-reviews-page.component';

const REVIEW: AdminReviewDto = {
  id: 'r1',
  author: 'Марта Д.',
  text: 'Дуже зручно вести бюджет щодня',
  rating: 4,
  isPublished: true,
  createdAt: '2026-11-02T10:00:00Z',
};

async function open(url = '/admin/reviews'): Promise<{ harness: RouterTestingHarness; http: HttpTestingController }> {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: 'admin/reviews', component: AdminReviewsPageComponent }])],
  });
  const http = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url, AdminReviewsPageComponent);
  return { harness, http };
}

function flushInitial(http: HttpTestingController, items: AdminReviewDto[]): void {
  const lists = http.match((req) => req.url.endsWith('/api/admin/reviews') && req.method === 'GET');
  for (const request of lists) {
    const status = request.request.params.get('status');
    const pageSize = request.request.params.get('pageSize');
    if (status && pageSize === '10') {
      request.flush({ items: [], total: status === 'published' ? 3 : 1, page: 1, pageSize: 10 });
    } else {
      request.flush({ items, total: items.length, page: 1, pageSize: 10 });
    }
  }
  http.expectOne((req) => req.url.endsWith('/api/reviews')).flush({ average: 4.5, items: [] });
}

describe('AdminReviewsPageComponent', () => {
  it('renders the rows and the stat cards from the API', async () => {
    const { harness, http } = await open();
    flushInitial(http, [REVIEW]);
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelectorAll('tbody tr').length).toBe(1);
    expect(root.querySelector('sb-rating')?.getAttribute('aria-label')).toBe('4 із 5');
    expect(root.textContent).toContain('4,5');
    expect(root.textContent).toContain('02.11.2026');
  });

  it('sends the status and rating filters from the URL', async () => {
    const { harness, http } = await open('/admin/reviews?status=hidden&rating=5');
    const requests = http.match((req) => req.url.endsWith('/api/admin/reviews') && req.method === 'GET');
    const listRequest = requests.find((request) => request.request.params.get('rating') === '5');
    expect(listRequest?.request.params.get('status')).toBe('hidden');
    requests.forEach((request) => request.flush({ items: [], total: 0, page: 1, pageSize: 10 }));
    http.expectOne((req) => req.url.endsWith('/api/reviews')).flush({ average: 0, items: [] });
    harness.detectChanges();
  });

  it('flips the published flag with the quick toggle and keeps the other fields', async () => {
    const { harness, http } = await open();
    flushInitial(http, [REVIEW]);
    harness.detectChanges();
    const toggle = (harness.routeNativeElement as HTMLElement).querySelector<HTMLButtonElement>('[aria-label^="Приховати відгук"]');
    expect(toggle).toBeTruthy();
    toggle?.click();
    const request = http.expectOne((req) => req.url.endsWith('/api/admin/reviews/r1'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ author: 'Марта Д.', text: REVIEW.text, rating: 4, isPublished: false });
    request.flush({ ...REVIEW, isPublished: false });
    http.match(() => true).forEach((pending) => pending.flush({ items: [], total: 0, page: 1, pageSize: 10, average: 0 }));
  });

  it('deletes a review only after the confirmation', async () => {
    const { harness, http } = await open();
    flushInitial(http, [REVIEW]);
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('[aria-label^="Видалити відгук"]')?.click();
    harness.detectChanges();
    http.expectNone((req) => req.method === 'DELETE');
    const confirm = [...root.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((button) => button.textContent?.trim() === 'Видалити');
    confirm?.click();
    const request = http.expectOne((req) => req.url.endsWith('/api/admin/reviews/r1'));
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    http.match(() => true).forEach((pending) => pending.flush({ items: [], total: 0, page: 1, pageSize: 10, average: 0 }));
  });
});
