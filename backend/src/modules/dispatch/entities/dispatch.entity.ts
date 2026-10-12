import { Column, Entity, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import type { DispatchStatus } from '@brics/shared';

/**
 * DSP-01 — the delivery challan that leaves the gate with the truck.
 *
 * Quantity only: ACCOUNTING_RULES puts value on the invoice, so a challan
 * writes stock and never a journal. Which document moves the stock depends on
 * which one came first — see ADR-041 and `movedStock`.
 */
@Entity('dispatches')
export class Dispatch extends TenantBaseEntity {
  @Column({ name: 'challan_no', type: 'varchar', length: 30 })
  challanNo: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'customer_party_id', type: 'uuid' })
  @Index()
  customerPartyId: string;

  /** Invoice-first flow: the bill already moved the stock (ADR-038). */
  @Column({ name: 'sales_invoice_id', type: 'uuid', nullable: true })
  salesInvoiceId: string | null;

  @Column({ name: 'sales_order_id', type: 'uuid', nullable: true })
  salesOrderId: string | null;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId: string | null;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId: string | null;

  /** The labour group that loaded the truck — VEH-05 prices the loading from it. */
  @Column({ name: 'loading_group_id', type: 'uuid', nullable: true })
  loadingGroupId: string | null;

  @Column({ name: 'dispatch_date', type: 'date' })
  dispatchDate: string;

  @Column({ name: 'loading_location', type: 'varchar', length: 200, nullable: true })
  loadingLocation: string | null;

  @Column({ name: 'delivery_location', type: 'varchar', length: 200, nullable: true })
  deliveryLocation: string | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: DispatchStatus;

  /**
   * True when confirming this challan is what deducted the yard. False when an
   * invoice had already done it. Written by the service, never by a caller —
   * it is the record of which document owns the deduction (ADR-041).
   */
  @Column({ name: 'moved_stock', type: 'boolean', default: false })
  movedStock: boolean;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @Column({ name: 'delivered_on', type: 'date', nullable: true })
  deliveredOn: string | null;

  @Column({ name: 'received_by', type: 'varchar', length: 100, nullable: true })
  receivedBy: string | null;

  @Column({ name: 'delivery_remarks', type: 'text', nullable: true })
  deliveryRemarks: string | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
