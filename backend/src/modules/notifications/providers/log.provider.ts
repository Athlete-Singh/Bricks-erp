import { Logger } from '@nestjs/common';
import type { NotificationProvider, OutgoingMessage } from './notification-provider';

/** No gateway configured: the alert is kept in the outbox and the log, and nothing is sent. */
export class LogProvider implements NotificationProvider {
  readonly name = 'log' as const;
  readonly dryRun = true;
  private readonly logger = new Logger('Notifications');

  send(message: OutgoingMessage): Promise<{ messageId: string | null }> {
    this.logger.log(`[not sent — NOTIFY_PROVIDER=log] ${message.channel} to ${message.to}: ${message.body}`);
    return Promise.resolve({ messageId: null });
  }
}
