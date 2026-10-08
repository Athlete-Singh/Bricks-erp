import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../common/entities/base.entity';

/**
 * An account that can be posted to (ACC-01). Party ledgers get `partyId` set
 * when parties arrive in P3; everything else is a plain ledger.
 */
@Entity('ledgers')
export class Ledger extends TenantBaseEntity {
  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  /** Set on seeded ledgers so posting rules can find them by meaning, not name. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  code: string | null;

  /** The party this ledger belongs to, for customer/supplier/Sardar accounts (P3). */
  @Column({ name: 'party_id', type: 'uuid', nullable: true })
  partyId: string | null;

  // Opening balances (ACC-04). Kept as two columns rather than one signed
  // amount so the books read the way an accountant writes them. NUMERIC(18,2)
  // and carried as strings — never a float (CONVENTIONS).
  @Column({ name: 'opening_debit', type: 'numeric', precision: 18, scale: 2, default: 0 })
  openingDebit: string;

  @Column({ name: 'opening_credit', type: 'numeric', precision: 18, scale: 2, default: 0 })
  openingCredit: string;

  /** The financial year the opening balance belongs to. */
  @Column({ name: 'opening_financial_year_id', type: 'uuid', nullable: true })
  openingFinancialYearId: string | null;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
