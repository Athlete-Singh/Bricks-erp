import { Column, Entity, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import type { VehicleExpenseKind } from '@brics/shared';

/**
 * VEH-03…06 — what a vehicle cost: diesel, repairs, loading and hire.
 *
 * One table, four kinds, because they differ only in which expense ledger they
 * debit and all four feed the same vehicle P&L. Diesel drawn from the kiln's
 * own tank is the exception that posts no journal — that fuel entered the books
 * on its purchase bill, so this only moves the stock (ADR-043).
 */
@Entity('vehicle_expenses')
export class VehicleExpense extends TenantBaseEntity {
  @Column({ name: 'vehicle_id', type: 'uuid' })
  @Index()
  vehicleId: string;

  @Column({ name: 'trip_id', type: 'uuid', nullable: true })
  tripId: string | null;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ type: 'varchar', length: 20 })
  kind: VehicleExpenseKind;

  @Column({ name: 'expense_date', type: 'date' })
  expenseDate: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  /** Litres, for diesel. */
  @Column({ type: 'numeric', precision: 18, scale: 3, nullable: true })
  quantity: string | null;

  @Column({ name: 'paid_from_ledger_id', type: 'uuid', nullable: true })
  paidFromLedgerId: string | null;

  /** Who is owed, when it was not paid on the spot. */
  @Column({ name: 'party_id', type: 'uuid', nullable: true })
  partyId: string | null;

  @Column({ name: 'item_id', type: 'uuid', nullable: true })
  itemId: string | null;

  @Column({ name: 'warehouse_id', type: 'uuid', nullable: true })
  warehouseId: string | null;

  /** Set when the fuel came out of the kiln's own tank instead of a pump. */
  @Column({ name: 'stock_movement_id', type: 'uuid', nullable: true })
  stockMovementId: string | null;

  @Column({ name: 'voucher_id', type: 'uuid', nullable: true })
  voucherId: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  reference: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
