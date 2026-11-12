import { Component } from '@angular/core';
import { AuthResponse } from '../models/auth';

@Component({ selector: 'sb-test-page', template: '' })
export class TestPageComponent {}

export function authResponse(token: string, refresh: string): AuthResponse {
  return {
    accessToken: token,
    accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    refreshToken: refresh,
    user: {
      id: '1',
      email: 'user@example.com',
      firstName: 'Тест',
      lastName: 'Користувач',
      roles: ['User'],
      planCode: 'start',
      createdAt: '2026-11-11T00:00:00Z',
    },
  };
}
