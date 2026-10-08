import type { EntityManager } from 'typeorm';
import { LEDGER_GROUP_SEED, LEDGER_SEED, VOUCHER_TYPE_SEED } from '@brics/shared';
import { LedgerGroup } from './entities/ledger-group.entity';
import { Ledger } from './entities/ledger.entity';
import { VoucherType } from './entities/voucher-type.entity';

export interface ChartSeedResult {
  groups: number;
  ledgers: number;
  voucherTypes: number;
}

/**
 * Builds one company's chart of accounts (ACC-01).
 *
 * A plain function taking an `EntityManager`, not a Nest service, because three
 * different callers need it: company creation (inside its transaction), the
 * first-run bootstrap, and the backfill for companies that predate P2.1a.
 * Keeping one implementation means the three can never drift apart.
 *
 * Idempotent, keyed on `code`. A re-run re-syncs structure (a group's nature,
 * its parent, a ledger's group) but never overwrites the owner's own data —
 * names stay renamed and opening balances stay put.
 */
export async function seedChartForCompany(manager: EntityManager, companyId: string): Promise<ChartSeedResult> {
  const groupRepo = manager.getRepository(LedgerGroup);
  const ledgerRepo = manager.getRepository(Ledger);
  const voucherTypeRepo = manager.getRepository(VoucherType);

  // Groups first, parents before children — the seed list is ordered that way.
  const groupIdByCode = new Map<string, string>();
  for (const seed of LEDGER_GROUP_SEED) {
    const parentId = seed.parent ? (groupIdByCode.get(seed.parent) ?? null) : null;
    const existing = await groupRepo.findOne({ where: { companyId, code: seed.code } });

    const saved = existing
      ? await groupRepo.save(
          Object.assign(existing, { nature: seed.nature, isDirect: seed.isDirect ?? false, parentId }),
        )
      : await groupRepo.save(
          groupRepo.create({
            companyId,
            code: seed.code,
            name: seed.name,
            nature: seed.nature,
            isDirect: seed.isDirect ?? false,
            parentId,
            isSystem: true,
          }),
        );
    groupIdByCode.set(seed.code, saved.id);
  }

  for (const seed of LEDGER_SEED) {
    const groupId = groupIdByCode.get(seed.group);
    if (!groupId) {
      throw new Error(`Ledger seed '${seed.code}' points at unknown group '${seed.group}'`);
    }
    const existing = await ledgerRepo.findOne({ where: { companyId, code: seed.code } });
    if (existing) {
      if (existing.groupId !== groupId) await ledgerRepo.save(Object.assign(existing, { groupId }));
      continue;
    }
    await ledgerRepo.save(ledgerRepo.create({ companyId, groupId, code: seed.code, name: seed.name, isSystem: true }));
  }

  for (const seed of VOUCHER_TYPE_SEED) {
    const existing = await voucherTypeRepo.findOne({ where: { companyId, code: seed.code } });
    if (existing) continue;
    await voucherTypeRepo.save(
      voucherTypeRepo.create({ companyId, code: seed.code, name: seed.name, prefix: seed.prefix, isSystem: true }),
    );
  }

  return {
    groups: LEDGER_GROUP_SEED.length,
    ledgers: LEDGER_SEED.length,
    voucherTypes: VOUCHER_TYPE_SEED.length,
  };
}
