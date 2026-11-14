import { PLATFORM_ID } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiUrl } from '../../../core/api/api-url';
import { ReviewsDto } from '../../../core/models/public-content';
import { REVIEWS } from './public-content.data';
import { PublicContentService } from './public-content.service';

function setup(platform: 'browser' | 'server'): { service: PublicContentService; http: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: PLATFORM_ID, useValue: platform }],
  });
  return { service: TestBed.inject(PublicContentService), http: TestBed.inject(HttpTestingController) };
}

describe('PublicContentService', () => {
  it('uses the constants and makes no HTTP calls on the server', () => {
    const { service, http } = setup('server');
    expect(service.reviews()()).toEqual(REVIEWS);
    service.plans();
    service.faq();
    http.expectNone(() => true);
  });

  it('starts with the constants in the browser and replaces them with the API value', () => {
    const { service, http } = setup('browser');
    const reviews = service.reviews();
    expect(reviews()).toEqual(REVIEWS);
    const next: ReviewsDto = { average: 4, items: [{ id: 'x', author: 'Марта Д.', text: 'Дуже зручно користуватись', rating: 4 }] };
    http.expectOne(apiUrl('/api/reviews')).flush(next);
    expect(reviews()).toEqual(next);
  });

  it('requests each resource once per session', () => {
    const { service, http } = setup('browser');
    service.reviews();
    service.reviews();
    http.expectOne(apiUrl('/api/reviews')).flush(REVIEWS);
    service.reviews();
    http.expectNone(apiUrl('/api/reviews'));
  });

  it('requests again after invalidation', () => {
    const { service, http } = setup('browser');
    service.faq();
    http.expectOne(apiUrl('/api/faq')).flush([]);
    service.invalidate('faq');
    service.faq();
    const again = http.expectOne((request) => request.url === apiUrl('/api/faq'));
    expect(again.request.params.has('_')).toBe(true);
    again.flush([]);
  });

  it('keeps the constants when the API fails', () => {
    const { service, http } = setup('browser');
    const reviews = service.reviews();
    http.expectOne(apiUrl('/api/reviews')).flush({ title: 'fail' }, { status: 500, statusText: 'Server Error' });
    expect(reviews()).toEqual(REVIEWS);
  });
});
