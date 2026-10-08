import type { Health } from '@brics/shared';
import { apiClient } from '@/lib/api-client';

/** `apiClient` unwraps the envelope (ADR-017), so this is the payload itself. */
export function fetchHealth(signal?: AbortSignal) {
  return apiClient.get<Health>('/health', signal);
}
