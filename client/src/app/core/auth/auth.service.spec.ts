import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiUrl } from '../api/api-url';
import { TestPageComponent, authResponse } from './auth-testing';
import { AuthService, REFRESH_TOKEN_KEY } from './auth.service';

describe('AuthService.refresh', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: TestPageComponent }]),
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends one request for three parallel calls and shares the result', async () => {
    const calls = [auth.refresh(), auth.refresh(), auth.refresh()];
    const requests = http.match(apiUrl('/api/auth/refresh'));
    expect(requests.length).toBe(1);
    expect(requests[0].request.body).toEqual({ refreshToken: 'refresh-1' });
    requests[0].flush(authResponse('access-2', 'refresh-2'));

    const results = await Promise.all(calls);
    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);
    expect(auth.token()).toBe('access-2');
    expect(auth.isSignedIn()).toBe(true);
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-2');
  });

  it('starts a new request after the previous one settled', async () => {
    const first = auth.refresh();
    http.expectOne(apiUrl('/api/auth/refresh')).flush(authResponse('a', 'refresh-2'));
    await first;
    const second = auth.refresh();
    const request = http.expectOne(apiUrl('/api/auth/refresh'));
    expect(request.request.body).toEqual({ refreshToken: 'refresh-2' });
    request.flush(authResponse('b', 'refresh-3'));
    await second;
  });
});
