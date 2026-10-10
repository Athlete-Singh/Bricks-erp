import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * SYN-01 — a replay record for a mobile create.
 *
 * No `updated_at`, no soft-delete: a row either exists (seen before, replay the
 * stored result) or it does not. Housekeeping is a separate concern; today
 * nothing deletes these rows and we accept the slow growth, because losing one
 * is worse than keeping one too many.
 */
@Entity('idempotency_keys')
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  /** `METHOD path-pattern`, e.g. `POST /production/batches`. */
  @Column({ type: 'varchar', length: 120 })
  endpoint: string;

  /** sha-256 hex of the canonicalised request body. */
  @Column({ name: 'request_hash', type: 'char', length: 64 })
  requestHash: string;

  @Column({ name: 'response_status', type: 'smallint' })
  responseStatus: number;

  @Column({ name: 'response_body', type: 'jsonb' })
  responseBody: unknown;
}
