import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { SUPPORT_SESSION_TTL_MS, type SupportSessionDto } from '@brics/shared';
import { AuditService } from '../audit/audit.service';
import { Company } from '../company/entities/company.entity';
import { User } from '../auth/entities/user.entity';
import { SupportSession } from './entities/support-session.entity';

@Injectable()
export class SupportSessionService {
  constructor(
    @InjectRepository(SupportSession) private sessionRepo: Repository<SupportSession>,
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private audit: AuditService,
  ) {}

  /**
   * Open a session or return the existing one. The partial unique in the
   * schema is the ultimate authority on "one open at a time"; we check first
   * because a 409 at the service layer carries a readable message, and the
   * returning check keeps the endpoint idempotent for a UI that double-clicks.
   */
  async open(platformUserId: string, tenantId: string, reason: string): Promise<SupportSession> {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      throw new BadRequestException('A reason is required — it goes on the audit trail');
    }

    const tenant = await this.companyRepo.findOneBy({ id: tenantId });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const existing = await this.sessionRepo.findOne({
      where: { platformUserId, companyId: tenantId, closedAt: IsNull() },
    });
    if (existing) {
      if (existing.expiresAt.getTime() <= Date.now()) {
        // Expired but not yet closed — close it on this path too, so the
        // caller can open a fresh one without waiting for the next request to
        // walk through the guard.
        await this.closeExpired(existing);
      } else {
        throw new ConflictException('A support session for this tenant is already open');
      }
    }

    const now = new Date();
    const session = await this.sessionRepo.save(
      this.sessionRepo.create({
        companyId: tenantId,
        platformUserId,
        reason: trimmed,
        openedAt: now,
        expiresAt: new Date(now.getTime() + SUPPORT_SESSION_TTL_MS),
      }),
    );

    await this.audit.record({
      companyId: tenantId,
      userId: platformUserId,
      entityName: 'support_sessions',
      entityId: session.id,
      action: 'CREATE',
      // The opening row carries its own kind + id — the request-level
      // context is still `user` here (the admin is on a platform endpoint),
      // so override explicitly.
      actorKind: 'platform_support',
      supportSessionId: session.id,
      after: { reason: trimmed, openedAt: session.openedAt, expiresAt: session.expiresAt },
    });

    return session;
  }

  async close(sessionId: string, actorUserId: string): Promise<SupportSession> {
    const session = await this.sessionRepo.findOneBy({ id: sessionId });
    if (!session) {
      throw new NotFoundException('Support session not found');
    }
    if (session.closedAt) {
      return session; // idempotent
    }
    if (session.platformUserId !== actorUserId) {
      throw new BadRequestException('Only the opener can close a support session');
    }

    session.closedAt = new Date();
    session.closedBy = 'manual';
    const saved = await this.sessionRepo.save(session);

    await this.audit.record({
      companyId: session.companyId,
      userId: actorUserId,
      entityName: 'support_sessions',
      entityId: session.id,
      action: 'UPDATE',
      actorKind: 'platform_support',
      supportSessionId: session.id,
      before: { closedAt: null },
      after: { closedAt: saved.closedAt, closedBy: 'manual' },
    });
    return saved;
  }

  /** Called by the guard when the token's session is past its window. */
  async closeExpired(session: SupportSession): Promise<SupportSession> {
    if (session.closedAt) return session;
    session.closedAt = new Date();
    session.closedBy = 'expiry';
    const saved = await this.sessionRepo.save(session);
    await this.audit.record({
      companyId: session.companyId,
      userId: session.platformUserId,
      entityName: 'support_sessions',
      entityId: session.id,
      action: 'UPDATE',
      actorKind: 'system',
      before: { closedAt: null },
      after: { closedAt: saved.closedAt, closedBy: 'expiry' },
    });
    return saved;
  }

  async findActiveForUserTenant(platformUserId: string, tenantId: string): Promise<SupportSession | null> {
    return this.sessionRepo.findOne({
      where: { platformUserId, companyId: tenantId, closedAt: IsNull() },
    });
  }

  async requireById(id: string): Promise<SupportSession> {
    const session = await this.sessionRepo.findOneBy({ id });
    if (!session) {
      throw new NotFoundException('Support session not found');
    }
    return session;
  }

  async listForUser(platformUserId: string, tenantId?: string): Promise<SupportSession[]> {
    return this.sessionRepo.find({
      where: tenantId ? { platformUserId, companyId: tenantId } : { platformUserId },
      order: { openedAt: 'DESC' },
    });
  }

  async listForTenant(tenantId: string): Promise<SupportSession[]> {
    return this.sessionRepo.find({ where: { companyId: tenantId }, order: { openedAt: 'DESC' } });
  }

  async toDto(session: SupportSession): Promise<SupportSessionDto> {
    const [tenant, user] = await Promise.all([
      this.companyRepo.findOneBy({ id: session.companyId }),
      this.userRepo.findOneBy({ id: session.platformUserId }),
    ]);
    return {
      id: session.id,
      tenantId: session.companyId,
      tenantName: tenant?.name ?? '',
      platformUserId: session.platformUserId,
      platformUserName: user?.name ?? '',
      reason: session.reason,
      openedAt: session.openedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      closedAt: session.closedAt ? session.closedAt.toISOString() : null,
      closedBy: session.closedBy,
    };
  }
}
