import type { NotificationEvent, NotificationStatus } from '@brics/shared';
import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/** NTF-01 — one alert in the outbox: written with the event, sent after it commits. */
@Entity('notifications')
export class Notification extends TenantBaseEntity {
  @Column({ type: 'varchar', length: 32 })
  event: NotificationEvent;

  @Column({ type: 'varchar', length: 16 })
  channel: 'sms' | 'whatsapp';

  @Column({ name: 'to_phone', type: 'varchar', length: 20 })
  toPhone: string;

  @Column({ type: 'text' })
  body: string;

  /** The template's variables, for gateways (MSG91 DLT) that fill the text themselves. */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  variables: Record<string, string>;

  @Column({ name: 'source_type', type: 'varchar', length: 32 })
  sourceType: string;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId: string;

  @Column({ type: 'varchar', length: 16, default: 'queued' })
  status: NotificationStatus;

  @Column({ type: 'varchar', length: 16, nullable: true })
  provider: string | null;

  @Column({ name: 'provider_message_id', type: 'varchar', length: 128, nullable: true })
  providerMessageId: string | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @Column({ name: 'next_attempt_at', type: 'timestamptz', nullable: true })
  nextAttemptAt: Date | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;
}
