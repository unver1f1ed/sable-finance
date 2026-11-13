import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService, REFRESH_TOKEN_KEY } from '../auth/auth.service';
import { TestPageComponent, authResponse } from '../auth/auth-testing';
import { apiUrl } from './api-url';
import { authInterceptor } from './auth.interceptor';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function unauthorized() {
  return { type: 't', title: 'Unauthorized', status: 401, detail: 'Потрібна авторизація', code: 'unauthorized' };
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: TestPageComponent }]),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth.setSession(authResponse('access-1', 'refresh-1'), true);
  });

  afterEach(() => controller.verify());

  it('refreshes once and retries once after a 401', async () => {
    const result = firstValueFrom(http.get<{ ok: boolean }>(apiUrl('/api/me')));

    const first = controller.expectOne(apiUrl('/api/me'));
    expect(first.request.headers.get('Authorization')).toBe('Bearer access-1');
    first.flush(unauthorized(), { status: 401, statusText: 'Unauthorized' });

    const refresh = controller.expectOne(apiUrl('/api/auth/refresh'));
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-1' });
    refresh.flush(authResponse('access-2', 'refresh-2'));
    await tick();

    const retry = controller.expectOne(apiUrl('/api/me'));
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
    retry.flush({ ok: true });

    expect(await result).toEqual({ ok: true });
  });

  it('clears the session and does not retry when the refresh fails', async () => {
    const result = firstValueFrom(http.get(apiUrl('/api/me'))).catch((error: unknown) => error);

    controller.expectOne(apiUrl('/api/me')).flush(unauthorized(), { status: 401, statusText: 'Unauthorized' });
    controller
      .expectOne(apiUrl('/api/auth/refresh'))
      .flush({ ...unauthorized(), code: 'invalid_refresh_token' }, { status: 401, statusText: 'Unauthorized' });
    await tick();

    const error = (await result) as { status: number };
    expect(error.status).toBe(401);
    expect(auth.status()).toBe('signedOut');
    expect(auth.token()).toBeNull();
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    controller.expectNone(apiUrl('/api/me'));
  });

  it('keeps the session and rethrows the original error when the refresh fails with a network or server error', async () => {
    for (const status of [0, 503]) {
      auth.setSession(authResponse('access-1', 'refresh-1'), true);
      const result = firstValueFrom(http.get(apiUrl('/api/me'))).catch((error: unknown) => error);

      controller.expectOne(apiUrl('/api/me')).flush(unauthorized(), { status: 401, statusText: 'Unauthorized' });
      const refresh = controller.expectOne(apiUrl('/api/auth/refresh'));
      if (status === 0) {
        refresh.error(new ProgressEvent('error'));
      } else {
        refresh.flush({}, { status, statusText: 'Service Unavailable' });
      }
      await tick();

      const error = (await result) as { status: number };
      expect(error.status).toBe(401);
      expect(auth.status()).toBe('signedIn');
      expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-1');
      controller.expectNone(apiUrl('/api/me'));
    }
  });

  it('does not attach the token to other origins', () => {
    void firstValueFrom(http.get('https://other.example/data'));
    const other = controller.expectOne('https://other.example/data');
    expect(other.request.headers.has('Authorization')).toBe(false);
    other.flush({});

    void firstValueFrom(http.get(apiUrl('/api/me')));
    const own = controller.expectOne(apiUrl('/api/me'));
    expect(own.request.headers.get('Authorization')).toBe('Bearer access-1');
    own.flush({});
  });

  it('never retries auth endpoints', async () => {
    const result = firstValueFrom(http.post(apiUrl('/api/auth/login'), {})).catch((error: unknown) => error);
    controller
      .expectOne(apiUrl('/api/auth/login'))
      .flush({ ...unauthorized(), code: 'invalid_credentials' }, { status: 401, statusText: 'Unauthorized' });
    await result;
    controller.expectNone(apiUrl('/api/auth/refresh'));
  });
});
