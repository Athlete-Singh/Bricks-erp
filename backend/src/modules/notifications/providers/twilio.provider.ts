import {
  type FetchFn,
  isRetryableStatus,
  type NotificationProvider,
  type OutgoingMessage,
  ProviderError,
} from './notification-provider';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  /** A sender number, or a Messaging Service SID (`MG…`). For WhatsApp, the WhatsApp-enabled number. */
  from: string;
}

/** Twilio Messages API — SMS, or WhatsApp with the `whatsapp:` prefix. */
export class TwilioProvider implements NotificationProvider {
  readonly name = 'twilio' as const;
  readonly dryRun = false;

  constructor(
    private readonly config: TwilioConfig,
    private readonly http: FetchFn = fetch,
  ) {}

  async send(message: OutgoingMessage): Promise<{ messageId: string | null }> {
    const wa = message.channel === 'whatsapp';
    const form = new URLSearchParams({ To: `${wa ? 'whatsapp:' : ''}+${message.to}`, Body: message.body });
    if (this.config.from.startsWith('MG')) form.set('MessagingServiceSid', this.config.from);
    else form.set('From', `${wa ? 'whatsapp:' : ''}${this.config.from}`);

    let res: Response;
    try {
      res = await this.http(`https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64')}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (e) {
      throw new ProviderError(`Twilio unreachable: ${(e as Error).message}`, true);
    }
    const body = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok) {
      throw new ProviderError(`Twilio ${res.status}: ${body.message ?? 'refused'}`, isRetryableStatus(res.status));
    }
    return { messageId: body.sid ?? null };
  }
}
