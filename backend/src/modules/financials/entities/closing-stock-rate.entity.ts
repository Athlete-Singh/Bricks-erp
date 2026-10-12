import { Column, Entity, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/**
 * OQ #4 — closing stock is valued at a rate per grade entered at period end,
 * not a computed weighted average.
 *
 * Only the rate is stored. The quantity is read from the stock ledger as at
 * `as_of`, so a valuation can never disagree with the stock register — and a
 * grade sitting in the yard with no rate entered is reported as unvalued rather
 * than silently counted as worthless.
 */
@Entity('closing_stock_rates')
export class ClosingStockRate extends TenantBaseEntity {
  @Column({ name: 'as_of', type: 'date' })
  @Index()
  asOf: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  rate: string;
}
