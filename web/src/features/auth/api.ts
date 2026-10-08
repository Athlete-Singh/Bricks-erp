import type { AuthResponseDto, ChangePasswordDto, LoginDto, SwitchCompanyDto } from '@brics/shared';
import { apiClient } from '@/lib/api-client';
import { getRefreshToken } from '@/lib/auth-token';

/** Mirrors the JWT claims returned by `GET /auth/me`. */
export interface SessionUser {
  sub: string;
  email: string | null;
  mobile: string;
  name: string;
  companyId: string;
  roleCode: string;
  permissions: string[];
  isSuperAdmin: boolean;
}

export function login(dto: LoginDto) {
  return apiClient.post<AuthResponseDto>('/auth/login', dto);
}

export function switchCompany(dto: SwitchCompanyDto) {
  return apiClient.post<AuthResponseDto>('/auth/switch-company', dto);
}

export function changePassword(dto: ChangePasswordDto) {
  return apiClient.post<{ success: boolean }>('/auth/change-password', dto);
}

export function fetchMe(signal?: AbortSignal) {
  return apiClient.get<SessionUser>('/auth/me', signal);
}

export function logout() {
  return apiClient.post<{ success: boolean }>('/auth/logout');
}

/**
 * Exchanges the stored refresh token for a fresh pair. Used once on boot to
 * recover a session after a reload — mid-session refreshes are handled
 * transparently inside `api-client`.
 */
export function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.reject(new Error('No refresh token'));
  return apiClient.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken });
}
