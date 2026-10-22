import type {
  NotificationDto,
  NotificationQueryInput,
  NotificationSettingsDto,
  UpdateNotificationSettingsInput,
} from '@brics/shared';
import { apiClient } from '@/lib/api-client';

function query(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as Array<[string, string | number | undefined]>) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const fetchNotificationSettings = (signal?: AbortSignal) =>
  apiClient.get<NotificationSettingsDto>('/notifications/settings', signal);
export const updateNotificationSettings = (dto: UpdateNotificationSettingsInput) =>
  apiClient.put<NotificationSettingsDto>('/notifications/settings', dto);
export const fetchNotifications = (params: NotificationQueryInput, signal?: AbortSignal) =>
  apiClient.getPaged<NotificationDto>(`/notifications${query(params)}`, signal);
export const sendPendingNotifications = () =>
  apiClient.post<{ sent: number; logged: number; failed: number; retrying: number }>('/notifications/send-pending');
