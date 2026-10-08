import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { seedChartForCompany, type ChartSeedResult } from './chart-of-accounts.seed';
import { LedgerGroup } from './entities/ledger-group.entity';
import { Ledger } from './entities/ledger.entity';
import { VoucherType } from './entities/voucher-type.entity';

export type { ChartSeedResult };

/**
 * Reads a company's chart of accounts, and seeds it via the shared
 * `seedChartForCompany` (ACC-01). The seeding itself lives in
 * `chart-of-accounts.seed.ts` so the bootstrap and backfill scripts, which have
 * no Nest container, run exactly the same code.
 */
@Injectable()
export class ChartOfAccountsService {
  constructor(
    @InjectRepository(LedgerGroup) private groupRepo: Repository<LedgerGroup>,
    @InjectRepository(Ledger) private ledgerRepo: Repository<Ledger>,
    @InjectRepository(VoucherType) private voucherTypeRepo: Repository<VoucherType>,
    private dataSource: DataSource,
  ) {}

  async seedForCompany(companyId: string, manager?: EntityManager): Promise<ChartSeedResult> {
    return manager
      ? seedChartForCompany(manager, companyId)
      : this.dataSource.transaction((em) => seedChartForCompany(em, companyId));
  }

  async hasChart(companyId: string): Promise<boolean> {
    return (await this.groupRepo.count({ where: { companyId } })) > 0;
  }

  // ── reads ──────────────────────────────────────────────────────────────────

  async findGroups(companyId: string): Promise<LedgerGroup[]> {
    return this.groupRepo.find({ where: { companyId }, order: { name: 'ASC' } });
  }

  async findLedgers(companyId: string): Promise<Ledger[]> {
    return this.ledgerRepo.find({ where: { companyId }, order: { name: 'ASC' } });
  }

  async findVoucherTypes(companyId: string): Promise<VoucherType[]> {
    return this.voucherTypeRepo.find({ where: { companyId }, order: { name: 'ASC' } });
  }

  /** Looks a seeded ledger up by its stable code — how posting rules find accounts. */
  async requireLedgerByCode(companyId: string, code: string): Promise<Ledger> {
    const ledger = await this.ledgerRepo.findOne({ where: { companyId, code } });
    if (!ledger) {
      throw new Error(`Ledger '${code}' is missing for company ${companyId}. Re-run the chart of accounts seed.`);
    }
    return ledger;
  }
}
