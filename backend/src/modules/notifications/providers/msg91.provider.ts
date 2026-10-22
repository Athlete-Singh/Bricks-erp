import type { NotificationEvent } from '@brics/shared';
import {
  type FetchFn,
  isRetryableStatus,
  type NotificationProvider,
  type OutgoingMessage,
  ProviderError,
} from './notification-provider';

export interface Msg91Config {
  authKey: string;
  /** DLT-registered template (flow) id per alert. */
  templates: Partial<Record<NotificationEvent, string>>;
}

/**
 * MSG91 Flow API: the text is the DLT-registered template, filled from the
 * alert's variables. India's DLT rules mean free text cannot be sent at all.
 */
export class Msg91Provider implements NotificationProvider {
  readonly name = 'msg91' as const;
  readonly dryRun = false;

  constructor(
    private readonly config: Msg91Config,
    private readonly http: FetchFn = fetch,
  ) {}

  async send(message: OutgoingMessage): Promise<{ messageId: string | null }> {
    const templateId = this.config.templates[message.event];
    if (!templateId) {
      throw new ProviderError(`No MSG91 template id set for ${message.event}`, false);
    }
    let res: Response;
    try {
      res = await this.http('https://control.msg91.com/api/v5/flow', {
        method: 'POST',
        headers: { authkey: this.config.authKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          short_url: '0',
          recipients: [{ mobiles: message.to, ...message.variables }],
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (e) {
      throw new ProviderError(`MSG91 unreachable: ${(e as Error).message}`, true);
    }
    const body = (await res.json().catch(() => ({}))) as { type?: string; message?: string };
    if (!res.ok || body.type === 'error') {
      throw new ProviderError(`MSG91 ${res.status}: ${body.message ?? 'refused'}`, isRetryableStatus(res.status));
    }
    return { messageId: body.message ?? null };
  }
}
