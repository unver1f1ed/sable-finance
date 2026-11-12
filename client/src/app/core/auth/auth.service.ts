import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApiService } from '../api/auth-api.service';
import { AuthResponse, LoginRequest, RegisterRequest, UserDto } from '../models/auth';

export const REFRESH_TOKEN_KEY = 'sable.refreshToken';

export type AuthStatus = 'unknown' | 'signedIn' | 'signedOut';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly userState = signal<UserDto | null>(null);
  private readonly statusState = signal<AuthStatus>('unknown');
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;
  private refreshInFlight: Promise<AuthResponse> | null = null;
  private initPromise: Promise<void> | null = null;

  readonly user = this.userState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly isSignedIn = computed(() => this.statusState() === 'signedIn');
  readonly isAdmin = computed(() => this.userState()?.roles.includes('Admin') ?? false);
  readonly planCode = computed(() => this.userState()?.planCode ?? null);

  init(): Promise<void> {
    this.initPromise ??= this.restoreSession();
    return this.initPromise;
  }

  ready(): Promise<void> {
    return this.isBrowser ? this.init() : Promise.resolve();
  }

  token(): string | null {
    return this.accessToken;
  }

  tokenExpiresWithin(milliseconds: number): boolean {
    return this.accessToken !== null && this.accessTokenExpiresAt - Date.now() < milliseconds;
  }

  hasRefreshToken(): boolean {
    return this.readRefreshToken() !== null;
  }

  async login(request: LoginRequest, remember: boolean): Promise<UserDto> {
    const response = await firstValueFrom(this.api.login(request));
    this.setSession(response, remember);
    return response.user;
  }

  async register(request: RegisterRequest): Promise<UserDto> {
    const response = await firstValueFrom(this.api.register(request));
    this.setSession(response, true);
    return response.user;
  }

  async logout(): Promise<void> {
    const token = this.readRefreshToken();
    this.clearSession();
    if (token) {
      try {
        await firstValueFrom(this.api.logout({ refreshToken: token }));
      } catch {
        // The server logout is best effort: the local session is already gone.
      }
    }
    await this.router.navigateByUrl('/');
  }

  refresh(): Promise<AuthResponse> {
    this.refreshInFlight ??= this.performRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  setSession(response: AuthResponse, remember?: boolean): void {
    this.accessToken = response.accessToken;
    this.accessTokenExpiresAt = Date.parse(response.accessTokenExpiresAt);
    this.userState.set(response.user);
    this.statusState.set('signedIn');
    this.writeRefreshToken(response.refreshToken, remember);
  }

  clearSession(): void {
    this.accessToken = null;
    this.accessTokenExpiresAt = 0;
    this.userState.set(null);
    this.statusState.set('signedOut');
    this.removeRefreshToken();
  }

  async handleSessionLost(): Promise<void> {
    this.clearSession();
    const path = this.router.url.split(/[?#]/)[0];
    const isPrivate = path.startsWith('/app') || path.startsWith('/admin');
    await this.router.navigate([isPrivate || !path ? '/' : path], { queryParams: { auth: 'login' } });
  }

  private async restoreSession(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    this.listenToStorage();
    if (!this.readRefreshToken()) {
      this.statusState.set('signedOut');
      return;
    }
    try {
      await this.refresh();
    } catch (error) {
      this.statusState.set('signedOut');
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        this.removeRefreshToken();
      }
    }
  }

  private async performRefresh(): Promise<AuthResponse> {
    const token = this.readRefreshToken();
    if (!token) {
      throw new Error('No refresh token');
    }
    const response = await firstValueFrom(this.api.refresh({ refreshToken: token }));
    this.setSession(response);
    return response;
  }

  private listenToStorage(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === REFRESH_TOKEN_KEY && event.newValue === null && event.storageArea === window.localStorage) {
        if (this.statusState() === 'signedIn') {
          this.accessToken = null;
          this.userState.set(null);
          this.statusState.set('signedOut');
          const path = this.router.url;
          if (path.startsWith('/app') || path.startsWith('/admin')) {
            void this.router.navigateByUrl('/');
          }
        }
      }
    });
  }

  private readRefreshToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return this.read(() => window.localStorage) ?? this.read(() => window.sessionStorage);
  }

  private writeRefreshToken(token: string, remember?: boolean): void {
    if (!this.isBrowser) {
      return;
    }
    const persistent = remember ?? this.read(() => window.localStorage) !== null;
    const target = persistent ? () => window.localStorage : () => window.sessionStorage;
    const other = persistent ? () => window.sessionStorage : () => window.localStorage;
    try {
      target().setItem(REFRESH_TOKEN_KEY, token);
      other().removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Storage can be unavailable (private mode): the session then lasts until the page is closed.
    }
  }

  private removeRefreshToken(): void {
    if (!this.isBrowser) {
      return;
    }
    for (const storage of [() => window.localStorage, () => window.sessionStorage]) {
      try {
        storage().removeItem(REFRESH_TOKEN_KEY);
      } catch {
        // Ignore unavailable storage.
      }
    }
  }

  private read(storage: () => Storage): string | null {
    try {
      return storage().getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }
}
