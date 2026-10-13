import { DataSource } from 'typeorm';
import { BrickType } from '../../src/modules/inventory/entities/brick-type.entity';
import { Item } from '../../src/modules/inventory/entities/item.entity';
import { Unit } from '../../src/modules/inventory/entities/unit.entity';

/**
 * A brick grade and the item it is stocked and sold as (ADR-051).
 *
 * Every suite needs both now, and writing them apart is how a fixture ends up
 * with a grade whose item belongs to someone else — which is the exact bug the
 * link exists to prevent.
 */
export async function makeBrickGrade(
  ds: DataSource,
  options: { companyId: string; grade: string; unitId?: string; itemName?: string },
): Promise<BrickType> {
  const { companyId, grade } = options;

  let unitId = options.unitId;
  if (!unitId) {
    const units = ds.getRepository(Unit);
    const existing = await units.findOne({ where: { companyId }, order: { createdAt: 'ASC' } });
    unitId = existing?.id ?? (await units.save(units.create({ companyId, name: 'Thousand', abbreviation: 'K' }))).id;
  }

  const items = ds.getRepository(Item);
  const item = await items.save(
    items.create({ companyId, name: options.itemName ?? grade, category: 'other', unitId }),
  );

  const grades = ds.getRepository(BrickType);
  return grades.save(grades.create({ companyId, grade, itemId: item.id }));
}
