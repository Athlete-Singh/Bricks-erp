import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import type { AuditActorKind } from '@brics/shared';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'entity_name', type: 'varchar', length: 100 })
  entityName: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 100, nullable: true })
  entityId: string | null;

  @Column({ type: 'varchar', length: 50 })
  action: string; // e.g., "CREATE", "UPDATE", "DELETE", "LOGIN"

  @Column({ name: 'before_state', type: 'jsonb', nullable: true })
  beforeState: Record<string, unknown> | null;

  @Column({ name: 'after_state', type: 'jsonb', nullable: true })
  afterState: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  /** S2.1 — what kind of actor wrote the row. `platform_support` ⇔ support_session_id. */
  @Column({ name: 'actor_kind', type: 'varchar', length: 20, default: 'user' })
  actorKind: AuditActorKind;

  @Column({ name: 'support_session_id', type: 'uuid', nullable: true })
  supportSessionId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
