import 'reflect-metadata';
import dataSource from '../data-source';
import { runRbacSeed } from './seed-rbac';

/**
 * Entry point for `pnpm --filter @brics/backend seed`.
 * Safe to run repeatedly — every seed in here is an upsert.
 */
async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    const result = await runRbacSeed(dataSource);
    // eslint-disable-next-line no-console -- reason: CLI script, no Nest logger here
    console.log(`✔ RBAC seeded: ${result.roles} roles, ${result.permissions} permissions, ${result.grants} grants.`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console -- reason: CLI script, no Nest logger here
  console.error('✖ Seed failed:', error);
  process.exitCode = 1;
});
