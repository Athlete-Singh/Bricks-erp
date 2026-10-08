import type { CreateUserDto, UpdateUserDto } from '@brics/shared';
import { apiClient } from '@/lib/api-client';

/** Mirrors the backend's `UserSummary` — deliberately never carries a password. */
export interface UserRow {
  id: string;
  email: string | null;
  mobile: string;
  name: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  roleCode: string | null;
  siteIds: string[];
  createdAt: string;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
}

export function fetchUsers(signal?: AbortSignal) {
  return apiClient.get<UserRow[]>('/users', signal);
}

/** The 9 seeded roles, for the role picker. */
export function fetchRoles(signal?: AbortSignal) {
  return apiClient.get<Role[]>('/users/roles', signal);
}

export function createUser(dto: CreateUserDto) {
  return apiClient.post<UserRow>('/users', dto);
}

export function updateUser(id: string, dto: UpdateUserDto) {
  return apiClient.patch<UserRow>(`/users/${id}`, dto);
}
