import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AuthResponse,
  ChangePasswordRequest,
  ChangePlanRequest,
  DeleteAccountRequest,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
  UpdateProfileRequest,
  UserDto,
} from '../models/auth';
import { apiUrl } from './api-url';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(apiUrl('/api/auth/register'), request);
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(apiUrl('/api/auth/login'), request);
  }

  refresh(request: RefreshRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(apiUrl('/api/auth/refresh'), request);
  }

  logout(request: RefreshRequest): Observable<void> {
    return this.http.post<void>(apiUrl('/api/auth/logout'), request);
  }

  me(): Observable<UserDto> {
    return this.http.get<UserDto>(apiUrl('/api/me'));
  }

  updateProfile(request: UpdateProfileRequest): Observable<UserDto> {
    return this.http.put<UserDto>(apiUrl('/api/me'), request);
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>(apiUrl('/api/me/password'), request);
  }

  changePlan(request: ChangePlanRequest): Observable<AuthResponse> {
    return this.http.put<AuthResponse>(apiUrl('/api/me/plan'), request);
  }

  deleteAccount(request: DeleteAccountRequest): Observable<void> {
    return this.http.delete<void>(apiUrl('/api/me'), { body: request });
  }
}
