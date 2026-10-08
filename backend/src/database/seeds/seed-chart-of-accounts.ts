import type { DataSource } from 'typeorm';
import { seedChartForCompany } from '../../accounting/chart-of-accounts.seed';
import { LedgerGroup } from '../../accounting/entities/ledger-group.entity';
import { Company } from '../../modules/company/entities/company.entity';

export interface ChartBackfillResult {
  companiesSeeded: number;
  companiesToppedUp: number;
}

/**
 * Gives every existing company a chart of accounts.
 *
 * New companies get theirs inside `CompanyService.createCompany`; this covers
 * the ones created before P2.1a, and tops up any codes the seed has gained
 * since. Same implementation as the live path — see `chart-of-accounts.seed.ts`.
 */
export async function backfillChartOfAccounts(dataSource: DataSource): Promise<ChartBackfillResult> {
  const companies = await dataSource.getRepository(Company).find();
  let seeded = 0;
  let toppedUp = 0;

  for (const company of companies) {
    const had = await dataSource.getRepository(LedgerGroup).count({ where: { companyId: company.id } });
    await dataSource.transaction((manager) => seedChartForCompany(manager, company.id));
    if (had === 0) seeded += 1;
    else toppedUp += 1;
  }

  return { companiesSeeded: seeded, companiesToppedUp: toppedUp };
}
