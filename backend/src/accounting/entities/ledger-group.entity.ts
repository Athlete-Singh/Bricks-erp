import { Column, Entity } from 'typeorm';
import type { LedgerNature } from '@brics/shared';
import { TenantBaseEntity } from '../../common/entities/base.entity';

/**
 * A node in the chart of accounts (ACC-01). Tally-style, per company, so an
 * owner can rename or extend their own tree without touching another tenant's.
 */
@Entity('ledger_groups')
export class LedgerGroup extends TenantBaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** Stable identifier the seed and posting rules refer to, e.g. `SUNDRY_DEBTORS`. */
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @Column({ type: 'varchar', length: 20 })
  nature: LedgerNature;

  /** Counts towards gross profit rather than only net profit (P&L, P10). */
  @Column({ name: 'is_direct', type: 'boolean', default: false })
  isDirect: boolean;

  /** Seeded by BRICS: renameable, but never deletable — postings rely on it. */
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;
}
