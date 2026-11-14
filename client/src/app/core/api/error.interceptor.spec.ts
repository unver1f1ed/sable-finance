import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { TestPageComponent } from '../auth/auth-testing';
import { apiUrl } from './api-url';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let toast: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: TestPageComponent }]),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => controller.verify());

  it('shows the server detail for 429', async () => {
    const result = firstValueFrom(http.post(apiUrl('/api/auth/login'), {})).catch((error: unknown) => error);
    controller.expectOne(apiUrl('/api/auth/login')).flush(
      { type: 't', title: 'Too many', status: 429, detail: 'Забагато запитів. Спробуйте за хвилину.', code: 'too_many_requests' },
      { status: 429, statusText: 'Too Many Requests' },
    );
    await result;
    expect(toast.toasts().map((item) => item.text)).toEqual(['Забагато запитів. Спробуйте за хвилину.']);
  });

  it('does not toast validation errors', async () => {
    const result = firstValueFrom(http.get(apiUrl('/api/me'))).catch((error: unknown) => error);
    controller.expectOne(apiUrl('/api/me')).flush(
      { type: 't', title: 'Validation', status: 400, detail: 'x', code: 'validation_failed' },
      { status: 400, statusText: 'Bad Request' },
    );
    await result;
    expect(toast.toasts()).toEqual([]);
  });

  it('sends the user to the forbidden page when an admin endpoint answers 403', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const result = firstValueFrom(http.get(apiUrl('/api/admin/users'))).catch((error: unknown) => error);
    controller.expectOne(apiUrl('/api/admin/users')).flush(
      { type: 't', title: 'Forbidden', status: 403, detail: 'Недостатньо прав.', code: 'forbidden' },
      { status: 403, statusText: 'Forbidden' },
    );
    await result;
    expect(navigate).toHaveBeenCalledWith('/forbidden');
  });
});
