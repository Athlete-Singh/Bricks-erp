import type { Env } from '../../../config/env';
import { LogProvider } from './log.provider';
import { Msg91Provider } from './msg91.provider';
import type { NotificationProvider } from './notification-provider';
import { TwilioProvider } from './twilio.provider';

export const NOTIFICATION_PROVIDER = Symbol('NOTIFICATION_PROVIDER');

/**
 * Picks the gateway from the environment. A gateway named without its
 * credentials falls back to `log` rather than failing every send — the outbox
 * still records what would have gone out.
 */
export function providerFromEnv(env: Pick<Env, 'NOTIFY_PROVIDER'> & Partial<Env>): NotificationProvider {
  if (env.NOTIFY_PROVIDER === 'msg91' && env.MSG91_AUTH_KEY) {
    return new Msg91Provider({
      authKey: env.MSG91_AUTH_KEY,
      templates: {
        dispatch_sent: env.MSG91_TEMPLATE_DISPATCH_SENT,
        payment_received: env.MSG91_TEMPLATE_PAYMENT_RECEIVED,
        advance_alert: env.MSG91_TEMPLATE_ADVANCE_ALERT,
      },
    });
  }
  if (env.NOTIFY_PROVIDER === 'twilio' && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM) {
    return new TwilioProvider({
      accountSid: env.TWILIO_ACCOUNT_SID,
      authToken: env.TWILIO_AUTH_TOKEN,
      from: env.TWILIO_FROM,
    });
  }
  return new LogProvider();
}
