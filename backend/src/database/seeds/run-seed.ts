import 'reflect-metadata';
import dataSource from '../data-source';
import { seedBootstrap } from './seed-bootstrap';
import { runRbacSeed } from './seed-rbac';
import { backfillChartOfAccounts } from './seed-chart-of-accounts';

/* eslint-disable no-console -- reason: CLI script; the Nest logger is not running here */

/**
 * Entry point for `pnpm seed`. Safe to run repeatedly — every seed is an upsert,
 * and the bootstrap refuses to run once any user exists.
 */
async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    const rbac = await runRbacSeed(dataSource);
    console.log(`✔ RBAC: ${rbac.roles} roles, ${rbac.permissions} permissions, ${rbac.grants} grants.`);

    const chart = await backfillChartOfAccounts(dataSource);
    console.log(`✔ Chart of accounts: ${chart.companiesSeeded} seeded, ${chart.companiesToppedUp} already had one.`);

    const ownerMobile = process.env.SEED_OWNER_MOBILE;
    const ownerPassword = process.env.SEED_OWNER_PASSWORD;
    if (!ownerMobile || !ownerPassword) {
      console.log('• Bootstrap skipped: set SEED_OWNER_MOBILE and SEED_OWNER_PASSWORD to create the first Owner.');
      return;
    }

    const result = await dataSource.transaction((manager) =>
      seedBootstrap(manager, {
        companyName: process.env.SEED_COMPANY_NAME ?? 'My Brick Kiln',
        stateCode: process.env.SEED_COMPANY_STATE_CODE ?? '09',
        ownerName: process.env.SEED_OWNER_NAME ?? 'Owner',
        ownerMobile,
        ownerEmail: process.env.SEED_OWNER_EMAIL ?? null,
        ownerPassword,
      }),
    );

    console.log(
      result.created
        ? `✔ Bootstrap: company ${result.companyId} with one kiln, and an Owner who signs in with SEED_OWNER_MOBILE.`
        : `• Bootstrap skipped: ${result.reason}.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('✖ Seed failed:', error);
  process.exitCode = 1;
});
