import { Column, Entity } from 'typeorm';
import type { ProductionBatchStatus } from '@brics/shared';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/**
 * PRD-02 — one chamber loaded on one date in one kiln.
 *
 * Chamber is text, not an FK: there is no chamber master (see GLOSSARY), and
 * the same label (`Chamber 1`) is reused across many batches on many dates.
 */
@Entity('production_batches')
export class ProductionBatch extends TenantBaseEntity {
  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ type: 'varchar', length: 20 })
  chamber: string;

  @Column({ name: 'batch_date', type: 'date' })
  batchDate: string;

  /**
   * Advances once by the service: `open` → `firing` on the firing stage,
   * `firing` → `sorted` on the sorting stage. `closed` is reserved for a
   * later P6/P11 pass that marks a settled batch.
   */
  @Column({ type: 'varchar', length: 16, default: 'open' })
  status: ProductionBatchStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
