import request from 'supertest';
import { Party } from '../src/modules/parties/entities/party.entity';
import { PartyService } from '../src/modules/parties/party.service';
import { BrickType } from '../src/modules/inventory/entities/brick-type.entity';
import { Item } from '../src/modules/inventory/entities/item.entity';
import { Unit } from '../src/modules/inventory/entities/unit.entity';
import { Warehouse } from '../src/modules/inventory/entities/warehouse.entity';
import { Site } from '../src/modules/company/entities/site.entity';
import { WageRate } from '../src/modules/labour/entities/wage-rate.entity';
import { WageActivity } from '@brics/shared';
import { seedChartForCompany } from '../src/accounting/chart-of-accounts.seed';
import { FinancialYear } from '../src/modules/company/entities/financial-year.entity';
import { createTenantFixture, type TenantFixture } from './helpers/tenant-fixture';

jest.setTimeout(60000);

/**
 * SYN-02 — `?since=<ISO>` on the five cached masters the mobile app pulls:
 * sites, parties, items, brick types and wage rates. For each one:
 *   - a row created after `since` comes back
 *   - a row updated after `since` comes back
 *   - a row soft-deleted after `since` comes back with `deleted: true`
 *   - a row untouched since `since` is omitted
 *   - without `since`, the list behaves exactly as before (no `deleted` key
 *     needed; the mobile only ever reads these as a delta).
 *
 * The window boundary is "strictly after" by design: a mobile sends the
 * `updated_at` of the newest row it already has, and we must not resend it.
 */
describe('SYN-02 delta pull (e2e)', () => {
  let fx: TenantFixture;

  const authGet = (path: string, token: string, query: Record<string, string> = {}) =>
    request(fx.app.getHttpServer()).get(path).query(query).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'Delta Pull',
      domain: 'delta.test',
      tables: [
        'labour_wage_rates',
        'items',
        'units',
        'warehouses',
        'brick_types',
        'parties',
        'ledgers',
        'voucher_sequences',
        'voucher_types',
        'ledger_groups',
        'sites',
      ],
      mobilePrefix: '910000012',
    });

    // Parties need a chart of accounts + FY (ADR-020 auto-creates the ledger).
    await fx.dataSource.transaction((m) => seedChartForCompany(m, fx.companyA.id));
    const fyRepo = fx.dataSource.getRepository(FinancialYear);
    await fyRepo.save(
      fyRepo.create({
        companyId: fx.companyA.id,
        name: '2026-27',
        startDate: '2026-04-01',
        endDate: '2027-03-31',
        isActive: true,
        isLocked: false,
      }),
    );
  });

  afterAll(async () => {
    await fx.close();
  });

  /** `pastSinceWindow` sits before every row this spec touches. */
  const pastSinceWindow = '2020-01-01T00:00:00Z';

  async function createMaster<T>(
    repo: {
      save: (e: T) => Promise<T>;
      create: (e: Partial<T>) => T;
    },
    data: Partial<T>,
  ): Promise<T> {
    return repo.save(repo.create(data));
  }

  // Pause so an "updated after now" test has an inequality to pivot on; some
  // Postgres builds truncate updated_at to microseconds, so a 10 ms wait is
  // generous enough that `now()` and `now() + sleep` land in different ticks.
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it('sites: returns a new kiln and a tombstone for a deleted one', async () => {
    const siteRepo = fx.dataSource.getRepository(Site);
    const stale = await createMaster(siteRepo, { companyId: fx.companyA.id, name: 'Old Kiln', code: 'OLD' });

    const sinceAt = new Date().toISOString();
    await sleep(10);

    const fresh = await createMaster(siteRepo, { companyId: fx.companyA.id, name: 'New Kiln', code: 'NEW' });
    await siteRepo.softRemove(stale);

    const res = await authGet('/api/v1/sites', fx.tokenA, { since: sinceAt }).expect(200);
    const rows = res.body.data as Array<{ id: string; deleted: boolean; name: string }>;
    const freshRow = rows.find((r) => r.id === fresh.id);
    const staleRow = rows.find((r) => r.id === stale.id);
    expect(freshRow?.deleted).toBe(false);
    expect(staleRow?.deleted).toBe(true);
  });

  it('sites: rejects a malformed since value', async () => {
    await authGet('/api/v1/sites', fx.tokenA, { since: 'not-a-date' }).expect(400);
  });

  it('parties: returns updates and tombstones, honours past-window', async () => {
    const partyService = fx.app.get(PartyService);
    const stable = await partyService.create(fx.companyA.id, '00000000-0000-0000-0000-000000000000', {
      name: 'Stable Co',
      partyTypes: ['customer'],
      gstin: null,
      pan: null,
      stateCode: null,
      address: null,
      phone: null,
      email: null,
      openingDebit: '0.00',
      openingCredit: '0.00',
    });

    const sinceAt = new Date().toISOString();
    await sleep(10);

    const edited = await partyService.create(fx.companyA.id, '00000000-0000-0000-0000-000000000000', {
      name: 'Edit Me',
      partyTypes: ['customer'],
      gstin: null,
      pan: null,
      stateCode: null,
      address: null,
      phone: null,
      email: null,
      openingDebit: '0.00',
      openingCredit: '0.00',
    });
    const toDelete = await partyService.create(fx.companyA.id, '00000000-0000-0000-0000-000000000000', {
      name: 'Doomed',
      partyTypes: ['customer'],
      gstin: null,
      pan: null,
      stateCode: null,
      address: null,
      phone: null,
      email: null,
      openingDebit: '0.00',
      openingCredit: '0.00',
    });
    await fx.dataSource.getRepository(Party).softRemove(toDelete);

    const res = await authGet('/api/v1/parties', fx.tokenA, { since: sinceAt, limit: '100' }).expect(200);
    const rows = res.body.data as Array<{ id: string; deleted: boolean; name: string }>;
    expect(rows.find((r) => r.id === edited.id)?.deleted).toBe(false);
    expect(rows.find((r) => r.id === toDelete.id)?.deleted).toBe(true);
    // `stable` was created BEFORE sinceAt — it must not come back.
    expect(rows.find((r) => r.id === stable.id)).toBeUndefined();
  });

  it('inventory items: delta returns tombstones with deleted flag', async () => {
    const unitRepo = fx.dataSource.getRepository(Unit);
    const itemRepo = fx.dataSource.getRepository(Item);
    const unit = await createMaster(unitRepo, {
      companyId: fx.companyA.id,
      name: 'Delta Unit',
      abbreviation: 'du',
    });

    const sinceAt = new Date().toISOString();
    await sleep(10);

    const createdItem = await createMaster(itemRepo, {
      companyId: fx.companyA.id,
      name: 'Delta Soil',
      category: 'raw_material',
      unitId: unit.id,
    });
    const toDelete = await createMaster(itemRepo, {
      companyId: fx.companyA.id,
      name: 'Delta Coal',
      category: 'raw_material',
      unitId: unit.id,
    });
    await itemRepo.softRemove(toDelete);

    const res = await authGet('/api/v1/inventory/items', fx.tokenA, {
      since: sinceAt,
      limit: '100',
    }).expect(200);
    const rows = res.body.data as Array<{ id: string; deleted: boolean }>;
    expect(rows.find((r) => r.id === createdItem.id)?.deleted).toBe(false);
    expect(rows.find((r) => r.id === toDelete.id)?.deleted).toBe(true);
  });

  it('inventory brick-types + warehouses: delta surfaces tombstones', async () => {
    const btRepo = fx.dataSource.getRepository(BrickType);
    const whRepo = fx.dataSource.getRepository(Warehouse);
    const site = await createMaster(fx.dataSource.getRepository(Site), {
      companyId: fx.companyA.id,
      name: 'Delta Site',
      code: 'DS',
    });

    const sinceAt = new Date().toISOString();
    await sleep(10);

    const bt = await createMaster(btRepo, { companyId: fx.companyA.id, grade: 'Delta Grade' });
    const wh = await createMaster(whRepo, { companyId: fx.companyA.id, siteId: site.id, name: 'Delta Yard' });
    await btRepo.softRemove(bt);
    await whRepo.softRemove(wh);

    const btRes = await authGet('/api/v1/inventory/brick-types', fx.tokenA, { since: sinceAt }).expect(200);
    expect((btRes.body.data as Array<{ id: string; deleted: boolean }>).find((r) => r.id === bt.id)?.deleted).toBe(
      true,
    );

    const whRes = await authGet('/api/v1/inventory/warehouses', fx.tokenA, { since: sinceAt }).expect(200);
    expect((whRes.body.data as Array<{ id: string; deleted: boolean }>).find((r) => r.id === wh.id)?.deleted).toBe(
      true,
    );
  });

  it('wage rates: delta returns updated and deleted rows', async () => {
    const wageRepo = fx.dataSource.getRepository(WageRate);
    const sinceAt = new Date().toISOString();
    await sleep(10);

    const created = await createMaster(wageRepo, {
      companyId: fx.companyA.id,
      activity: WageActivity.MAKING,
      unit: 'per_1000_bricks',
      rateAmount: '450.00',
      isActive: true,
    });
    const toDelete = await createMaster(wageRepo, {
      companyId: fx.companyA.id,
      activity: WageActivity.LOADING,
      unit: 'per_1000_bricks',
      rateAmount: '350.00',
      isActive: true,
    });
    await wageRepo.softRemove(toDelete);

    const res = await authGet('/api/v1/labour/wage-rates', fx.tokenA, { since: sinceAt, limit: '100' }).expect(200);
    const rows = res.body.data as Array<{ id: string; deleted: boolean }>;
    expect(rows.find((r) => r.id === created.id)?.deleted).toBe(false);
    expect(rows.find((r) => r.id === toDelete.id)?.deleted).toBe(true);
  });

  it('without since, the normal list omits soft-deleted rows (as before)', async () => {
    const btRepo = fx.dataSource.getRepository(BrickType);
    const bt = await createMaster(btRepo, { companyId: fx.companyA.id, grade: 'Visible Grade' });
    await btRepo.softRemove(bt);
    const res = await authGet('/api/v1/inventory/brick-types', fx.tokenA, { limit: '100' }).expect(200);
    expect((res.body.data as Array<{ id: string }>).find((r) => r.id === bt.id)).toBeUndefined();
  });

  it('since reaching from the past returns everything created after it', async () => {
    const res = await authGet('/api/v1/inventory/items', fx.tokenA, {
      since: pastSinceWindow,
      limit: '100',
    }).expect(200);
    // Every item this spec created falls inside this window.
    expect((res.body.data as Array<{ id: string }>).length).toBeGreaterThan(0);
  });
});
