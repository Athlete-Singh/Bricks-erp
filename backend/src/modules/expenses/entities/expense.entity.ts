import { Column, Entity, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import type { ExpensePaymentMode, InstrumentType } from '@brics/shared';

/**
 * EXP-02 — a running cost of the kiln that no other module already books.
 *
 * Purchases, wages, vehicles and loading each have their own path; this is
 * electricity, rent, salary, office, government charges and the rest. The row
 * exists so the owner has a register to read, with the category and the payee
 * on it; the journal remains the authority on the money.
 */
@Entity('expenses')
export class Expense extends TenantBaseEntity {
  @Column({ name: 'expense_no', type: 'varchar', length: 30 })
  expenseNo: string;

  @Column({ name: 'site_id', type: 'uuid' })
  @Index()
  siteId: string;

  /** The expense ledger this landed on — an EXP-01 category. */
  @Column({ name: 'category_ledger_id', type: 'uuid' })
  categoryLedgerId: string;

  @Column({ name: 'expense_date', type: 'date' })
  expenseDate: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 10 })
  mode: ExpensePaymentMode;

  @Column({ name: 'paid_from_ledger_id', type: 'uuid', nullable: true })
  paidFromLedgerId: string | null;

  @Column({ name: 'party_id', type: 'uuid', nullable: true })
  partyId: string | null;

  @Column({ name: 'instrument_type', type: 'varchar', length: 10, nullable: true })
  instrumentType: InstrumentType | null;

  @Column({ name: 'instrument_ref', type: 'varchar', length: 80, nullable: true })
  instrumentRef: string | null;

  @Column({ name: 'voucher_id', type: 'uuid' })
  voucherId: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
