import { Column, Entity, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/**
 * VEH-02 — one run of one vehicle.
 *
 * Freight charged to a customer is optional: when the sales invoice already
 * carries a transport charge, the income was booked there and booking it again
 * here would count the same rupee twice (ADR-042).
 */
@Entity('vehicle_trips')
export class VehicleTrip extends TenantBaseEntity {
  @Column({ name: 'trip_no', type: 'varchar', length: 30 })
  tripNo: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  @Index()
  vehicleId: string;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId: string | null;

  @Column({ name: 'dispatch_id', type: 'uuid', nullable: true })
  dispatchId: string | null;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'trip_date', type: 'date' })
  tripDate: string;

  @Column({ name: 'route_from', type: 'varchar', length: 200, nullable: true })
  routeFrom: string | null;

  @Column({ name: 'route_to', type: 'varchar', length: 200, nullable: true })
  routeTo: string | null;

  @Column({ name: 'distance_km', type: 'numeric', precision: 18, scale: 3, nullable: true })
  distanceKm: string | null;

  @Column({ name: 'freight_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  freightAmount: string | null;

  @Column({ name: 'freight_party_id', type: 'uuid', nullable: true })
  freightPartyId: string | null;

  /** The journal that booked the freight income. Null when no freight was charged. */
  @Column({ name: 'voucher_id', type: 'uuid', nullable: true })
  voucherId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
