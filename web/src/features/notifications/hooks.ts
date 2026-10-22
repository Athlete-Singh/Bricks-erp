'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationQueryInput, UpdateNotificationSettingsInput } from '@brics/shared';
import * as api from './api';

export const notificationKeys = {
  settings: ['notifications', 'settings'] as const,
  list: (params: NotificationQueryInput) => ['notifications', 'list', params] as const,
};

export function useNotificationSettings() {
  return useQuery({
    queryKey: notificationKeys.settings,
    queryFn: ({ signal }) => api.fetchNotificationSettings(signal),
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateNotificationSettingsInput) => api.updateNotificationSettings(dto),
    onSuccess: (data) => queryClient.setQueryData(notificationKeys.settings, data),
  });
}

export function useNotifications(params: NotificationQueryInput) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: ({ signal }) => api.fetchNotifications(params, signal),
  });
}

export function useSendPending() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.sendPendingNotifications,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] }),
  });
}
