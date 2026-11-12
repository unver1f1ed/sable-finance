import { PlanCode } from './public-content';

export type { PlanCode };
export type Role = 'User' | 'Admin';

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  planCode: PlanCode;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  user: UserDto;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  planCode: PlanCode;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePlanRequest {
  planCode: PlanCode;
}

export interface DeleteAccountRequest {
  password: string;
}
