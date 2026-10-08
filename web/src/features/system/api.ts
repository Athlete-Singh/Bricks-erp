import { apiClient } from '@/lib/api-client';

export type HealthResponse = {
  data: {
    status: 'ok' | 'degraded';
    db: 'up' | 'down';
    uptime: number;
    timestamp: string;
  };
};

export function fetchHealth(signal?: AbortSignal) {
  return apiClient.get<HealthResponse>('/health', signal);
}
