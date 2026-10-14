import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { SupportSessionCloseKind } from '@brics/shared';

/**
 * The record of a platform admin's break-glass visit to one tenant. One row
 * per window of access; the partial unique in the migration keeps at most one
 * open per (platform user, tenant).
 */
@Entity('support_sessions')
export class SupportSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'platform_user_id', type: 'uuid' })
  platformUserId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'opened_at', type: 'timestamptz' })
  openedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'closed_by', type: 'varchar', length: 20, nullable: true })
  closedBy: SupportSessionCloseKind | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
