import { Column, Entity } from 'typeorm';
import type { ProductionStage } from '@brics/shared';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/**
 * PRD-03 — one row per batch per stage. The DB CHECK makes certain that only
 * the fields the stage owns are populated, so LEK-01 can read columns without
 * guessing which stage set them.
 */
@Entity('production_entries')
export class ProductionEntry extends TenantBaseEntity {
  @Column({ name: 'batch_id', type: 'uuid' })
  batchId: string;

  @Column({ type: 'varchar', length: 16 })
  stage: ProductionStage;

  @Column({ name: 'entry_date', type: 'date' })
  entryDate: string;

  // Scale 3 matches `stock_movements` — coal is weighed in tonnes, bricks in pieces.
  @Column({ name: 'green_bricks', type: 'numeric', precision: 18, scale: 3, default: 0 })
  greenBricks: string;

  @Column({ name: 'fired_bricks', type: 'numeric', precision: 18, scale: 3, default: 0 })
  firedBricks: string;

  @Column({ name: 'broken_bricks', type: 'numeric', precision: 18, scale: 3, default: 0 })
  brokenBricks: string;

  @Column({ name: 'reject_bricks', type: 'numeric', precision: 18, scale: 3, default: 0 })
  rejectBricks: string;

  /** Who moulded the green bricks (optional until P6 adds labour groups). */
  @Column({ name: 'sardar_party_id', type: 'uuid', nullable: true })
  sardarPartyId: string | null;

  /** Where sorted good bricks go — required for sorting, null for every other stage. */
  @Column({ name: 'warehouse_id', type: 'uuid', nullable: true })
  warehouseId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
