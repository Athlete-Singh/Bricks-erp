import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  NotificationEvent,
  NotificationQueryDto,
  NotificationSettingsDto,
  UpdateNotificationSettingsDto,
} from '@brics/shared';
import { DataSource, type EntityManager } from 'typeorm';
import type { Env } from '../../config/env';
import { AuditService } from '../audit/audit.service';
import { Company } from '../company/entities/company.entity';
import { Notification } from './entities/notification.entity';
import { NotificationSetting } from './entities/notification-setting.entity';
import { normalizeIndianMobile, renderTemplate } from './notification-templates';
import { NOTIFICATION_PROVIDER } from './providers/provider.factory';
import { type NotificationProvider, ProviderError } from './providers/notification-provider';

export interface EnqueueArgs {
  companyId: string;
  event: NotificationEvent;
  /** A party's phone, or `'owner'` for the company's owner alert number. */
  to: { phone: string | null } | 'owner';
  variables: Record<string, string>;
  sourceType: string;
  sourceId: string;
}

/** Retry gaps for a gateway's own trouble; after the last one the alert is `failed`. */
const RETRY_AFTER_MINUTES = [1, 5, 30, 120];

const EVENT_SETTING: Record<
  NotificationEvent,
  keyof Pick<NotificationSetting, 'dispatchSent' | 'paymentReceived' | 'advanceAlert'>
> = {
  dispatch_sent: 'dispatchSent',
  payment_received: 'paymentReceived',
  advance_alert: 'advanceAlert',
};

/**
 * NTF-01 — SMS / WhatsApp alerts through an outbox.
 *
 * The business transaction writes the alert (`enqueue`, with its manager), so
 * an alert exists exactly when the challan, receipt or advance committed — a
 * rollback takes it away, an idempotent replay never writes a second
 * (`uq_notifications_source`). Sending happens after the commit (`kick`) and
 * never slows or fails the entry itself; a refused or unreachable gateway is
 * retried and finally recorded as `failed`, for the owner to see.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly config: ConfigService<Env, true>,
    @Inject(NOTIFICATION_PROVIDER) private readonly provider: NotificationProvider,
  ) {}

  async getSettings(companyId: string): Promise<NotificationSettingsDto> {
    const row = await this.dataSource.getRepository(NotificationSetting).findOne({ where: { companyId } });
    return this.toDto(row);
  }

  async updateSettings(
    companyId: string,
    userId: string,
    dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettingsDto> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(NotificationSetting);
      const existing = await repo.findOne({ where: { companyId } });
      const before = existing ? this.toDto(existing) : null;
      const row = existing ?? repo.create({ companyId, createdBy: userId });
      if (dto.ownerPhone !== undefined) row.ownerPhone = dto.ownerPhone;
      if (dto.dispatchSent !== undefined) row.dispatchSent = dto.dispatchSent;
      if (dto.paymentReceived !== undefined) row.paymentReceived = dto.paymentReceived;
      if (dto.advanceAlert !== undefined) row.advanceAlert = dto.advanceAlert;
      row.updatedBy = userId;
      const saved = await repo.save(row);
      await this.audit.record(
        {
          companyId,
          userId,
          action: existing ? 'UPDATE' : 'CREATE',
          entityName: 'notification_settings',
          entityId: saved.id,
          before: before ? { ...before } : undefined,
          after: { ...this.toDto(saved) },
        },
        manager,
      );
      return this.toDto(saved);
    });
  }

  /**
   * Writes the alert in the caller's transaction, if the company has that
   * alert on and the recipient has a number we can text. Silent otherwise —
   * an alert is never a reason to refuse a challan or a receipt.
   */
  async enqueue(manager: EntityManager, args: EnqueueArgs): Promise<void> {
    const settings = await manager.findOne(NotificationSetting, { where: { companyId: args.companyId } });
    if (!settings?.[EVENT_SETTING[args.event]]) return;

    const to = normalizeIndianMobile(args.to === 'owner' ? settings.ownerPhone : args.to.phone);
    if (!to) return;

    const company = await manager.findOne(Company, { where: { id: args.companyId } });
    const variables = { company: company?.name ?? 'BRICS', ...args.variables };
    await manager
      .createQueryBuilder()
      .insert()
      .into(Notification)
      .values({
        companyId: args.companyId,
        event: args.event,
        channel: this.config.get('NOTIFY_CHANNEL', { infer: true }),
        toPhone: to,
        body: renderTemplate(args.event, variables),
        variables,
        sourceType: args.sourceType,
        sourceId: args.sourceId,
        status: 'queued',
      })
      .orIgnore()
      .execute();
  }

  /** After a commit: send what is waiting, without holding up the response. */
  kick(companyId: string): void {
    this.sendPending(companyId).catch((e: unknown) => this.logger.error(`Sending alerts failed: ${String(e)}`));
  }

  /**
   * Sends this company's queued alerts that are due. Rows are claimed with
   * `FOR UPDATE SKIP LOCKED`, so two overlapping runs never text anyone twice.
   */
  async sendPending(
    companyId: string,
    limit = 20,
  ): Promise<{ sent: number; logged: number; failed: number; retrying: number }> {
    const counts = { sent: 0, logged: 0, failed: 0, retrying: 0 };
    await this.dataSource.transaction(async (manager) => {
      const due = await manager
        .createQueryBuilder(Notification, 'n')
        .where('n.company_id = :companyId', { companyId })
        .andWhere("n.status = 'queued'")
        .andWhere('(n.next_attempt_at IS NULL OR n.next_attempt_at <= now())')
        .orderBy('n.created_at', 'ASC')
        .limit(limit)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();

      for (const n of due) {
        n.attempts += 1;
        n.provider = this.provider.name;
        try {
          const { messageId } = await this.provider.send({
            to: n.toPhone,
            channel: n.channel,
            event: n.event,
            body: n.body,
            variables: n.variables,
          });
          n.status = this.provider.dryRun ? 'logged' : 'sent';
          n.providerMessageId = messageId;
          n.sentAt = new Date();
          n.error = null;
          n.nextAttemptAt = null;
          counts[this.provider.dryRun ? 'logged' : 'sent']++;
        } catch (e) {
          const retryable = e instanceof ProviderError ? e.retryable : true;
          n.error = (e as Error).message.slice(0, 1000);
          const gap = RETRY_AFTER_MINUTES[n.attempts - 1];
          if (retryable && gap !== undefined) {
            n.nextAttemptAt = new Date(Date.now() + gap * 60_000);
            counts.retrying++;
          } else {
            n.status = 'failed';
            n.nextAttemptAt = null;
            counts.failed++;
          }
        }
        await manager.save(n);
      }
    });
    return counts;
  }

  async list(companyId: string, query: NotificationQueryDto) {
    const qb = this.dataSource
      .getRepository(Notification)
      .createQueryBuilder('n')
      .where('n.company_id = :companyId', { companyId });
    if (query.status) qb.andWhere('n.status = :status', { status: query.status });
    if (query.event) qb.andWhere('n.event = :event', { event: query.event });
    const [rows, total] = await qb
      .orderBy('n.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      items: rows.map((n) => ({
        id: n.id,
        event: n.event,
        channel: n.channel,
        toPhone: n.toPhone,
        body: n.body,
        status: n.status,
        provider: n.provider,
        error: n.error,
        attempts: n.attempts,
        sentAt: n.sentAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  private toDto(row: NotificationSetting | null): NotificationSettingsDto {
    return {
      ownerPhone: row?.ownerPhone ?? null,
      dispatchSent: row?.dispatchSent ?? false,
      paymentReceived: row?.paymentReceived ?? false,
      advanceAlert: row?.advanceAlert ?? false,
      provider: this.provider.name,
      channel: this.config.get('NOTIFY_CHANNEL', { infer: true }),
    };
  }
}
