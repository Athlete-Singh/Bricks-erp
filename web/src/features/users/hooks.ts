'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateUserDto, UpdateUserDto } from '@brics/shared';
import * as api from './api';

export const userKeys = {
  list: ['users', 'list'] as const,
  roles: ['users', 'roles'] as const,
};

export function useUsers() {
  return useQuery({
    queryKey: userKeys.list,
    queryFn: ({ signal }) => api.fetchUsers(signal),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: userKeys.roles,
    queryFn: ({ signal }) => api.fetchRoles(signal),
    // The seeded roles do not change while the app is open.
    staleTime: Infinity,
    // S1.1 added `platform_admin` to the catalogue — it is the SaaS platform's
    // role, not a kiln role, so a company owner should never see it in the
    // role picker. The guard would refuse the write anyway, but a role nobody
    // can usefully assign is clutter.
    select: (roles) => roles.filter((r) => r.code !== 'platform_admin'),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateUserDto) => api.createUser(dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: userKeys.list }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUserDto }) => api.updateUser(id, dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: userKeys.list }),
  });
}

/** `super_admin` → `Super Admin`, for a role code with no seeded row to hand. */
export function humanizeRole(code: string | null): string {
  if (!code) return '—';
  return code
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
