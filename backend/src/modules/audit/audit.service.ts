import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, EntityManager, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import type { AuditAction, AuditLogQueryDto } from '@brics/shared';
import type { Paginated } from '../../common/interceptors/response-envelope.interceptor';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditEvent {
  companyId: string | null;
  userId: string | null;
  entityName: string;
  entityId?: string | null;
  action: AuditAction;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Append-only trail of who changed what, when (ADM-07).
 *
 * `record` never throws: an audit write must not roll back or fail the business
 * operation it describes. Pass `manager` to write inside the caller's
 * transaction when the trail must be atomic with the change.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>) {}

  async record(event: AuditEvent, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(AuditLog) : this.auditRepo;
    try {
      await repo.save(
        repo.create({
          companyId: event.companyId,
          userId: event.userId,
          entityName: event.entityName,
          entityId: event.entityId ?? null,
          action: event.action,
          beforeState: event.before ?? null,
          afterState: event.after ?? null,
          ipAddress: event.ipAddress ?? null,
          userAgent: event.userAgent?.slice(0, 255) ?? null,
        }),
      );
    } catch (error) {
      this.logger.error({ err: error, event }, 'Failed to write audit log entry');
    }
  }

  async find(companyId: string, query: AuditLogQueryDto): Promise<Paginated<AuditLog>> {
    const where: Record<string, unknown> = { companyId };
    if (query.entityName) where.entityName = query.entityName;
    if (query.entityId) where.entityId = query.entityId;
    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;

    // `to` is inclusive of the whole day the user picked.
    const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : null;
    const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : null;
    if (from && to) where.createdAt = Between(from, to);
    else if (from) where.createdAt = MoreThanOrEqual(from);
    else if (to) where.createdAt = LessThanOrEqual(to);

    const [items, total] = await this.auditRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return { items, meta: { page: query.page, limit: query.limit, total } };
  }
}
