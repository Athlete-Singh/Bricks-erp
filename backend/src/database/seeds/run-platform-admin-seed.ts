import 'reflect-metadata';
import dataSource from '../data-source';
import { runRbacSeed } from './seed-rbac';
import { seedPlatformAdmin } from './seed-platform-admin';

/* eslint-disable no-console -- CLI script; the Nest logger is not running here */

async function main(): Promise<void> {
  const mobile = process.env.PLATFORM_ADMIN_MOBILE;
  const email = process.env.PLATFORM_ADMIN_EMAIL;
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  const name = process.env.PLATFORM_ADMIN_NAME ?? 'Platform Admin';

  if (!mobile || !email || !password) {
    console.error('✖ Set PLATFORM_ADMIN_MOBILE, PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD.');
    process.exitCode = 1;
    return;
  }

  await dataSource.initialize();
  try {
    const rbac = await runRbacSeed(dataSource);
    console.log(`✔ RBAC: ${rbac.roles} roles, ${rbac.permissions} permissions, ${rbac.grants} grants.`);

    const result = await dataSource.transaction((manager) =>
      seedPlatformAdmin(manager, { name, mobile, email, password }),
    );

    if (result.created === false && result.updated === false) {
      console.error(`✖ ${result.reason}`);
      process.exitCode = 1;
      return;
    }

    const action = result.created ? 'created' : 'updated (password reset)';
    console.log(`✔ Platform admin ${action}: user ${result.userId}, scaffold company ${result.scaffoldCompanyId}.`);
    console.log(`  mobile=${mobile}`);
    console.log(`  email=${email}`);
    console.log(`  login at /login then land on /admin/tenants`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('✖ Seed failed:', error);
  process.exitCode = 1;
});
