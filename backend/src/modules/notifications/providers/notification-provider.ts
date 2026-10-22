import type { NotificationEvent } from '@brics/shared';

export interface OutgoingMessage {
  /** `91XXXXXXXXXX`. */
  to: string;
  channel: 'sms' | 'whatsapp';
  event: NotificationEvent;
  body: string;
  variables: Record<string, string>;
}

export interface NotificationProvider {
  readonly name: 'log' | 'msg91' | 'twilio';
  /** True only for `log`: the message is written down, not delivered. */
  readonly dryRun: boolean;
  send(message: OutgoingMessage): Promise<{ messageId: string | null }>;
}

/**
 * A gateway refusal. `retryable` for the gateway's own trouble (5xx, 429,
 * timeouts); not for a refusal that will happen again (bad number, bad key,
 * unregistered template).
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export type FetchFn = typeof fetch;

/** Network failure or a status the gateway may answer differently next time. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}
