import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { seedChartForCompany } from '../src/accounting/chart-of-accounts.seed';
import { Ledger } from '../src/accounting/entities/ledger.entity';
import { FinancialYear } from '../src/modules/company/entities/financial-year.entity';
import { Site } from '../src/modules/company/entities/site.entity';
import { Item } from '../src/modules/inventory/entities/item.entity';
import { Unit } from '../src/modules/inventory/entities/unit.entity';
import { Warehouse } from '../src/modules/inventory/entities/warehouse.entity';
import { AuditService } from '../src/modules/audit/audit.service';
import { Notification } from '../src/modules/notifications/entities/notification.entity';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { ProviderError, type NotificationProvider } from '../src/modules/notifications/providers/notification-provider';
import { Party } from '../src/modules/parties/entities/party.entity';
import { PartyService } from '../src/modules/parties/party.service';
import { StockService } from '../src/stock/stock.service';
import { createTenantFixture, type TenantFixture } from './helpers/tenant-fixture';

jest.setTimeout(60000);

/**
 * NTF-01 — SMS / WhatsApp alerts through the outbox, against real Postgres.
 * The server runs with NOTIFY_PROVIDER=log here, so "sent" reads `logged`.
 */
describe('Notifications (e2e)', () => {
  let fx: TenantFixture;
  let ds: DataSource;
  let site: Site;
  let yard: Warehouse;
  let bricks: Item;
  let customer: Party;
  let sardar: Party;
  let cash: Ledger;
  const SYSTEM_USER = '00000000-0000-4000-8000-0000000000aa';

  const http = () => request(fx.app.getHttpServer());
  const auth = (token = fx.tokenA) => ({ Authorization: `Bearer ${token}` });
  const outbox = () =>
    ds.getRepository(Notification).find({ where: { companyId: fx.companyA.id }, order: { createdAt: 'ASC' } });
  const settle = () => new Promise((r) => setTimeout(r, 150));

  const raiseChallan = async () => {
    const res = await http()
      .post('/api/v1/dispatches')
      .set(auth())
      .send({
        siteId: site.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-10-20',
        lines: [{ itemId: bricks.id, warehouseId: yard.id, quantity: '5000' }],
      })
      .expect(201);
    return res.body.data as { id: string; challanNo: string };
  };

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'Notify Test',
      domain: 'notify.test',
      tables: [
        'notifications',
        'notification_settings',
        'labour_advances',
        'dispatch_lines',
        'dispatches',
        'stock_movements',
        'voucher_lines',
        'vouchers',
        'voucher_sequences',
        'idempotency_keys',
        'items',
        'warehouses',
        'units',
        'parties',
        'ledgers',
        'voucher_types',
        'ledger_groups',
        'financial_years',
        'sites',
      ],
      mobilePrefix: '910000021',
    });
    ds = fx.dataSource;
    await ds.transaction(async (m) => {
      await seedChartForCompany(m, fx.companyA.id);
      await seedChartForCompany(m, fx.companyB.id);
    });
    await ds.getRepository(FinancialYear).save(
      ds.getRepository(FinancialYear).create({
        companyId: fx.companyA.id,
        name: '2026-27',
        startDate: '2026-04-01',
        endDate: '2027-03-31',
        isActive: true,
        isLocked: false,
      }),
    );
    site = await ds
      .getRepository(Site)
      .save(ds.getRepository(Site).create({ companyId: fx.companyA.id, name: 'Kiln', code: 'K1' }));
    yard = await ds
      .getRepository(Warehouse)
      .save(ds.getRepository(Warehouse).create({ companyId: fx.companyA.id, siteId: site.id, name: 'Yard' }));
    const unit = await ds
      .getRepository(Unit)
      .save(ds.getRepository(Unit).create({ companyId: fx.companyA.id, name: 'Piece', abbreviation: 'pc' }));
    bricks = await ds
      .getRepository(Item)
      .save(
        ds
          .getRepository(Item)
          .create({ companyId: fx.companyA.id, name: 'Class 1', category: 'other', unitId: unit.id }),
      );
    const parties = fx.app.get(PartyService);
    const party = (name: string, type: 'customer' | 'sardar', phone: string | null) =>
      parties.create(fx.companyA.id, SYSTEM_USER, {
        name,
        partyTypes: [type],
        gstin: null,
        pan: null,
        stateCode: '09',
        address: null,
        phone,
        email: null,
        openingDebit: '0.00',
        openingCredit: '0.00',
      });
    customer = await party('Gupta Constructions', 'customer', '+91 98765-43210');
    sardar = await party('Ramu Sardar', 'sardar', null);
    cash = (await ds.getRepository(Ledger).findOne({ where: { companyId: fx.companyA.id, code: 'CASH' } }))!;
    await ds.transaction((m) =>
      fx.app.get(StockService).record(m, {
        companyId: fx.companyA.id,
        userId: SYSTEM_USER,
        warehouseId: yard.id,
        itemId: bricks.id,
        movementType: 'opening',
        direction: 'in',
        quantity: '100000.000',
        movementDate: '2026-08-01',
        sourceType: 'opening',
        sourceId: yard.id,
      }),
    );
  });

  afterAll(async () => {
    await fx.reset();
    await fx.close();
  });

  it('starts with every alert off, and says it is only logging', async () => {
    const res = await http().get('/api/v1/notifications/settings').set(auth()).expect(200);
    expect(res.body.data).toEqual({
      ownerPhone: null,
      dispatchSent: false,
      paymentReceived: false,
      advanceAlert: false,
      provider: 'log',
      channel: 'sms',
    });
  });

  it('a challan leaving the gate with alerts off writes nothing', async () => {
    const challan = await raiseChallan();
    await http().patch(`/api/v1/dispatches/${challan.id}/confirm`).set(auth()).send({}).expect(200);
    await settle();
    expect(await outbox()).toHaveLength(0);
  });

  it('refuses a number that is not a mobile', async () => {
    const res = await http()
      .put('/api/v1/notifications/settings')
      .set(auth())
      .send({ ownerPhone: '0522 223456' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('turns alerts on; another company cannot see or change them', async () => {
    await http()
      .put('/api/v1/notifications/settings')
      .set(auth())
      .send({ ownerPhone: '98111 22233', dispatchSent: true, advanceAlert: true })
      .expect(200);
    const b = await http().get('/api/v1/notifications/settings').set(auth(fx.tokenB)).expect(200);
    expect(b.body.data.dispatchSent).toBe(false);
    expect(b.body.data.ownerPhone).toBeNull();
  });

  it('a challan leaving the gate texts the customer once, even if the confirm is retried', async () => {
    const challan = await raiseChallan();
    await http()
      .patch(`/api/v1/dispatches/${challan.id}/confirm`)
      .set(auth())
      .send({ confirmedOn: '2026-10-20' })
      .expect(200);
    await http().patch(`/api/v1/dispatches/${challan.id}/confirm`).set(auth()).send({}).expect(422);
    await http().post('/api/v1/notifications/send-pending').set(auth()).expect(201);
    await settle();

    const rows = (await outbox()).filter((n) => n.event === 'dispatch_sent');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.toPhone).toBe('919876543210');
    expect(rows[0]!.body).toBe(
      `Notify Test A: Challan ${challan.challanNo} - 5,000 left our kiln on 20 Oct 2026. Thank you.`,
    );
    expect(rows[0]!.status).toBe('logged');
    expect(rows[0]!.attempts).toBe(1);
  });

  it('an advance that leaves the Sardar exposed alerts the owner', async () => {
    const res = await http()
      .post('/api/v1/labour/advances')
      .set(auth())
      .set('Idempotency-Key', 'adv-notify-1')
      .send({
        siteId: site.id,
        sardarPartyId: sardar.id,
        date: '2026-10-20',
        amount: '15000',
        paymentMode: 'cash',
        cashBankLedgerId: cash.id,
      })
      .expect(201);
    expect(res.body.data.warning).toBeTruthy();
    // The same request again (a phone resending): no second alert.
    await http()
      .post('/api/v1/labour/advances')
      .set(auth())
      .set('Idempotency-Key', 'adv-notify-1')
      .send({
        siteId: site.id,
        sardarPartyId: sardar.id,
        date: '2026-10-20',
        amount: '15000',
        paymentMode: 'cash',
        cashBankLedgerId: cash.id,
      })
      .expect(201);
    await settle();

    const rows = (await outbox()).filter((n) => n.event === 'advance_alert');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.toPhone).toBe('919811122233');
    expect(rows[0]!.body).toContain('Advance of Rs. 15,000.00 to Ramu Sardar');
  });

  it('lists the outbox newest first, to this company only', async () => {
    const a = await http().get('/api/v1/notifications').set(auth()).expect(200);
    expect((a.body.data as { event: string }[]).map((n) => n.event)).toEqual(['advance_alert', 'dispatch_sent']);
    expect(a.body.meta.total).toBe(2);
    const b = await http().get('/api/v1/notifications').set(auth(fx.tokenB)).expect(200);
    expect(b.body.data).toEqual([]);
  });

  it('a gateway outage is retried later; a refusal fails for good', async () => {
    let calls = 0;
    const flaky: NotificationProvider = {
      name: 'twilio',
      dryRun: false,
      send: () => {
        calls++;
        return Promise.reject(
          calls === 1
            ? new ProviderError('Twilio 503', true)
            : new ProviderError("Twilio 400: The 'To' number is not valid", false),
        );
      },
    };
    const service = new NotificationsService(ds, fx.app.get(AuditService), fx.app.get(ConfigService), flaky);
    const challan = await raiseChallan();
    await http().patch(`/api/v1/dispatches/${challan.id}/confirm`).set(auth()).send({}).expect(200);
    await settle();
    const row = (await outbox()).find((n) => n.sourceId === challan.id)!;
    // The app's own sender (log) may have got there first; put it back in the queue for the flaky gateway.
    await ds
      .getRepository(Notification)
      .update(row.id, { status: 'queued', attempts: 0, nextAttemptAt: null, sentAt: null });

    expect(await service.sendPending(fx.companyA.id)).toMatchObject({ retrying: 1 });
    let after = (await ds.getRepository(Notification).findOneBy({ id: row.id }))!;
    expect(after.status).toBe('queued');
    expect(after.nextAttemptAt!.getTime()).toBeGreaterThan(Date.now());

    await ds.getRepository(Notification).update(row.id, { nextAttemptAt: new Date(Date.now() - 1000) });
    expect(await service.sendPending(fx.companyA.id)).toMatchObject({ failed: 1 });
    after = (await ds.getRepository(Notification).findOneBy({ id: row.id }))!;
    expect(after.status).toBe('failed');
    expect(after.error).toContain('not valid');
    expect(after.attempts).toBe(2);
  });

  it('only a company manager may change the alerts', async () => {
    await http().put('/api/v1/notifications/settings').send({ dispatchSent: false }).expect(401);
  });
});
