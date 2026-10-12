import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { DataSource, EntityManager } from 'typeorm';
import type {
  CreateTripDto,
  CreateVehicleExpenseDto,
  TripQueryDto,
  VehicleExpenseKind,
  VehicleExpenseQueryDto,
  VehicleProfitabilityQueryDto,
} from '@brics/shared';
import { PostingService } from '../../accounting/posting.service';
import { Ledger } from '../../accounting/entities/ledger.entity';
import { BusinessRuleException } from '../../common/exceptions/business-rule.exception';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { todayCalendarDate } from '../../common/time/calendar-date';
import { StockService } from '../../stock/stock.service';
import { AuditService } from '../audit/audit.service';
import { Party } from '../parties/entities/party.entity';
import { Site } from '../company/entities/site.entity';
import { Item } from '../inventory/entities/item.entity';
import { Warehouse } from '../inventory/entities/warehouse.entity';
import { Dispatch } from '../dispatch/entities/dispatch.entity';
import { SalesCharge } from '../sales/entities/sales-charge.entity';
import { SalesInvoice } from '../sales/entities/sales-invoice.entity';
import { Vehicle } from './entities/vehicle.entity';
import { Driver } from './entities/driver.entity';
import { VehicleTrip } from './entities/vehicle-trip.entity';
import { VehicleExpense } from './entities/vehicle-expense.entity';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

const money = (v: Decimal.Value): string => new Decimal(v).toFixed(2);
const qty = (v: Decimal.Value): string => new Decimal(v).toFixed(3);

function assertNotFuture(date: string, label: string): void {
  const today = todayCalendarDate();
  if (date > today) {
    throw new BusinessRuleException('TRANSPORT_DATE_IN_FUTURE', `${label} cannot be dated after today (${today})`);
  }
}

/** Each kind of charge lands on its own ledger, so the P&L reads them apart. */
const EXPENSE_LEDGER: Record<VehicleExpenseKind, string> = {
  diesel: 'VEHICLE_DIESEL',
  maintenance: 'VEHICLE_REPAIRS',
  loading: 'LOADING_UNLOADING',
  hire: 'FREIGHT_EXPENSE',
};

@Injectable()
export class TransportOpsService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly dataSource: DataSource,
    private readonly stock: StockService,
    private readonly posting: PostingService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
  ) {}

  // ── shared guards (ADR-021: every id in the body is checked) ───────────────

  private async assertVehicle(manager: EntityManager, companyId: string, vehicleId: string): Promise<Vehicle> {
    const vehicle = await manager.findOne(Vehicle, { where: { id: vehicleId, companyId } });
    if (!vehicle) throw new BusinessRuleException('VEHICLE_NOT_FOUND', 'That vehicle does not exist');
    if (!vehicle.isActive) {
      throw new BusinessRuleException('VEHICLE_INACTIVE', `${vehicle.registrationNo} is no longer in use`);
    }
    return vehicle;
  }

  private async assertSite(manager: EntityManager, companyId: string, siteId: string): Promise<void> {
    const site = await manager.findOne(Site, { where: { id: siteId, companyId } });
    if (!site) throw new BusinessRuleException('SITE_NOT_FOUND', 'That kiln does not exist');
  }

  private async ledgerByCode(manager: EntityManager, companyId: string, code: string): Promise<Ledger> {
    const ledger = await manager.findOne(Ledger, { where: { companyId, code } });
    if (!ledger) throw new NotFoundException(`Ledger ${code} is missing from this company's chart of accounts`);
    return ledger;
  }

  private async nextTripNo(manager: EntityManager, companyId: string): Promise<string> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`TRIP:${companyId}`]);
    const rows = await manager.query<{ n: string | null }[]>(
      `SELECT MAX(NULLIF(regexp_replace("trip_no", '\\D', '', 'g'), '')::bigint) AS n
         FROM "vehicle_trips" WHERE "company_id" = $1`,
      [companyId],
    );
    return `TRP-${String(Number(rows[0]?.n ?? 0) + 1).padStart(5, '0')}`;
  }

  // ── VEH-02 trip log ────────────────────────────────────────────────────────

  async createTrip(
    companyId: string,
    userId: string,
    dto: CreateTripDto,
    idempotencyKey: string | null = null,
  ): Promise<VehicleTrip> {
    assertNotFuture(dto.tripDate, 'A trip');

    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        { companyId, userId, endpoint: 'POST /transport/trips', key: idempotencyKey, body: dto },
        async () => {
          const vehicle = await this.assertVehicle(manager, companyId, dto.vehicleId);
          await this.assertSite(manager, companyId, dto.siteId);

          if (dto.driverId) {
            const driver = await manager.findOne(Driver, { where: { id: dto.driverId, companyId } });
            if (!driver) throw new BusinessRuleException('DRIVER_NOT_FOUND', 'That driver does not exist');
            if (!driver.isActive) {
              throw new BusinessRuleException('DRIVER_INACTIVE', `${driver.name} is no longer in use`);
            }
          }

          let dispatch: Dispatch | null = null;
          if (dto.dispatchId) {
            dispatch = await manager.findOne(Dispatch, { where: { id: dto.dispatchId, companyId } });
            if (!dispatch) throw new BusinessRuleException('DISPATCH_NOT_FOUND', 'That challan does not exist');
          }

          let voucherId: string | null = null;
          if (dto.freightAmount && dto.freightPartyId) {
            const customer = await manager.findOne(Party, { where: { id: dto.freightPartyId, companyId } });
            if (!customer) throw new BusinessRuleException('CUSTOMER_NOT_FOUND', 'That customer does not exist');

            // ADR-042: freight is income once. If the invoice behind this trip's
            // challan already charged transport, charging it again here would
            // credit the same rupee twice and overstate what the kiln earned.
            if (dispatch) {
              await this.assertFreightNotAlreadyBilled(manager, companyId, dispatch);
            }

            const freightIncome = await this.ledgerByCode(manager, companyId, 'FREIGHT_INCOME');
            const posted = await this.posting.post(manager, {
              companyId,
              userId,
              voucherTypeCode: 'sales',
              voucherDate: dto.tripDate,
              siteId: dto.siteId,
              narration: `Freight charged to ${customer.name} — ${vehicle.registrationNo}`,
              sourceType: 'vehicle_trip',
              lines: [
                {
                  ledgerId: customer.ledgerId,
                  debit: money(dto.freightAmount),
                  credit: '0.00',
                  siteId: dto.siteId,
                  partyId: customer.id,
                },
                { ledgerId: freightIncome.id, debit: '0.00', credit: money(dto.freightAmount), siteId: dto.siteId },
              ] as never,
            });
            voucherId = posted.voucher.id;
          }

          const trip = await manager.save(
            manager.create(VehicleTrip, {
              companyId,
              createdBy: userId,
              updatedBy: userId,
              tripNo: await this.nextTripNo(manager, companyId),
              vehicleId: dto.vehicleId,
              driverId: dto.driverId ?? null,
              dispatchId: dto.dispatchId ?? null,
              siteId: dto.siteId,
              tripDate: dto.tripDate,
              routeFrom: dto.routeFrom ?? null,
              routeTo: dto.routeTo ?? null,
              distanceKm: dto.distanceKm ? qty(dto.distanceKm) : null,
              freightAmount: dto.freightAmount ? money(dto.freightAmount) : null,
              freightPartyId: dto.freightPartyId ?? null,
              voucherId,
              notes: dto.notes ?? null,
            }),
          );

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'vehicle_trips',
              entityId: trip.id,
              after: { tripNo: trip.tripNo, vehicle: vehicle.registrationNo, freightAmount: trip.freightAmount },
            },
            manager,
          );

          return trip;
        },
      ),
    );
  }

  /**
   * A challan's invoice may already carry a transport charge (ADR-039 — P8
   * bills loading and transport as composite supply). That is the same income.
   */
  private async assertFreightNotAlreadyBilled(
    manager: EntityManager,
    companyId: string,
    dispatch: Dispatch,
  ): Promise<void> {
    const invoice =
      (dispatch.salesInvoiceId
        ? await manager.findOne(SalesInvoice, { where: { id: dispatch.salesInvoiceId, companyId } })
        : null) ?? (await manager.findOne(SalesInvoice, { where: { dispatchId: dispatch.id, companyId } }));
    if (!invoice) return;

    const charge = await manager.findOne(SalesCharge, {
      where: { companyId, parentType: 'sales_invoice', parentId: invoice.id, kind: 'transport' },
    });
    if (charge) {
      throw new BusinessRuleException(
        'FREIGHT_ALREADY_BILLED',
        `Invoice ${invoice.invoiceNo} already charges transport on this load — do not charge it twice`,
      );
    }
  }

  // ── VEH-03…06 vehicle expenses ─────────────────────────────────────────────

  async createExpense(
    companyId: string,
    userId: string,
    dto: CreateVehicleExpenseDto,
    idempotencyKey: string | null = null,
  ): Promise<VehicleExpense> {
    assertNotFuture(dto.expenseDate, 'A vehicle charge');

    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        { companyId, userId, endpoint: 'POST /transport/expenses', key: idempotencyKey, body: dto },
        async () => {
          const vehicle = await this.assertVehicle(manager, companyId, dto.vehicleId);
          await this.assertSite(manager, companyId, dto.siteId);

          if (dto.tripId) {
            const trip = await manager.findOne(VehicleTrip, { where: { id: dto.tripId, companyId } });
            if (!trip) throw new BusinessRuleException('TRIP_NOT_FOUND', 'That trip does not exist');
            if (trip.vehicleId !== dto.vehicleId) {
              throw new BusinessRuleException('TRIP_VEHICLE_MISMATCH', 'That trip was run by a different vehicle');
            }
          }

          // ── fuel out of the kiln's own tank (ADR-043) ───────────────────────
          if (dto.warehouseId && dto.itemId && dto.quantity) {
            const item = await manager.findOne(Item, { where: { id: dto.itemId, companyId } });
            if (!item) throw new BusinessRuleException('ITEM_NOT_FOUND', 'That fuel does not exist in this company');
            const warehouse = await manager.findOne(Warehouse, { where: { id: dto.warehouseId, companyId } });
            if (!warehouse) throw new BusinessRuleException('WAREHOUSE_NOT_FOUND', 'That yard does not exist');

            // StockService refuses to drive the tank negative (ADR-026): if the
            // fuel is not there, the whole entry rolls back.
            const movement = await this.stock.record(manager, {
              companyId,
              userId,
              warehouseId: dto.warehouseId,
              itemId: dto.itemId,
              movementType: 'vehicle_fuel',
              direction: 'out',
              quantity: qty(dto.quantity),
              movementDate: dto.expenseDate,
              sourceType: 'vehicle_expense',
              notes: `Fuel issued to ${vehicle.registrationNo}${dto.reference ? ` (${dto.reference})` : ''}`,
            });

            return this.saveExpense(manager, companyId, userId, dto, {
              stockMovementId: movement.id,
              voucherId: null,
              vehicle,
            });
          }

          // ── a charge that moves money ───────────────────────────────────────
          const expenseLedger = await this.ledgerByCode(manager, companyId, EXPENSE_LEDGER[dto.kind]);

          let creditLedgerId: string;
          let creditPartyId: string | null = null;
          let narrationTail: string;
          if (dto.paidFromLedgerId) {
            const paidFrom = await manager.findOne(Ledger, { where: { id: dto.paidFromLedgerId, companyId } });
            if (!paidFrom) {
              throw new BusinessRuleException('LEDGER_NOT_FOUND', 'That cash or bank ledger does not exist');
            }
            creditLedgerId = paidFrom.id;
            narrationTail = `paid from ${paidFrom.name}`;
          } else {
            const party = await manager.findOne(Party, { where: { id: dto.partyId!, companyId } });
            if (!party) throw new BusinessRuleException('PARTY_NOT_FOUND', 'That party does not exist');
            if (!party.isActive) {
              throw new BusinessRuleException('PARTY_INACTIVE', `${party.name} is no longer in use`);
            }
            creditLedgerId = party.ledgerId;
            creditPartyId = party.id;
            narrationTail = `owed to ${party.name}`;
          }

          const posted = await this.posting.post(manager, {
            companyId,
            userId,
            // Paid now is a payment; owed is a journal. Calling both a payment
            // would put charges the kiln has not settled into the cash book.
            voucherTypeCode: dto.paidFromLedgerId ? 'payment' : 'journal',
            voucherDate: dto.expenseDate,
            siteId: dto.siteId,
            narration: `${dto.kind} — ${vehicle.registrationNo}, ${narrationTail}`,
            sourceType: 'vehicle_expense',
            lines: [
              { ledgerId: expenseLedger.id, debit: money(dto.amount), credit: '0.00', siteId: dto.siteId },
              {
                ledgerId: creditLedgerId,
                debit: '0.00',
                credit: money(dto.amount),
                siteId: dto.siteId,
                partyId: creditPartyId,
              },
            ] as never,
          });

          return this.saveExpense(manager, companyId, userId, dto, {
            stockMovementId: null,
            voucherId: posted.voucher.id,
            vehicle,
          });
        },
      ),
    );
  }

  private async saveExpense(
    manager: EntityManager,
    companyId: string,
    userId: string,
    dto: CreateVehicleExpenseDto,
    extra: { stockMovementId: string | null; voucherId: string | null; vehicle: Vehicle },
  ): Promise<VehicleExpense> {
    const expense = await manager.save(
      manager.create(VehicleExpense, {
        companyId,
        createdBy: userId,
        updatedBy: userId,
        vehicleId: dto.vehicleId,
        tripId: dto.tripId ?? null,
        siteId: dto.siteId,
        kind: dto.kind,
        expenseDate: dto.expenseDate,
        amount: money(dto.amount),
        quantity: dto.quantity ? qty(dto.quantity) : null,
        paidFromLedgerId: dto.paidFromLedgerId ?? null,
        partyId: dto.partyId ?? null,
        itemId: dto.itemId ?? null,
        warehouseId: dto.warehouseId ?? null,
        stockMovementId: extra.stockMovementId,
        voucherId: extra.voucherId,
        reference: dto.reference ?? null,
        notes: dto.notes ?? null,
      }),
    );

    await this.audit.record(
      {
        companyId,
        userId,
        action: 'CREATE',
        entityName: 'vehicle_expenses',
        entityId: expense.id,
        after: {
          kind: expense.kind,
          vehicle: extra.vehicle.registrationNo,
          amount: expense.amount,
          fromTank: extra.stockMovementId !== null,
        },
      },
      manager,
    );

    return expense;
  }

  // ── reads ──────────────────────────────────────────────────────────────────

  async listTrips(companyId: string, query: TripQueryDto) {
    const qb = this.em
      .createQueryBuilder(VehicleTrip, 't')
      .where('t.company_id = :companyId', { companyId })
      .andWhere('t.deleted_at IS NULL');

    if (query.vehicleId) qb.andWhere('t.vehicle_id = :vehicleId', { vehicleId: query.vehicleId });
    if (query.driverId) qb.andWhere('t.driver_id = :driverId', { driverId: query.driverId });
    if (query.siteId) qb.andWhere('t.site_id = :siteId', { siteId: query.siteId });
    if (query.fromDate) qb.andWhere('t.trip_date >= :fromDate', { fromDate: query.fromDate });
    if (query.toDate) qb.andWhere('t.trip_date <= :toDate', { toDate: query.toDate });

    const [items, total] = await qb
      .orderBy('t.trip_date', 'DESC')
      .addOrderBy('t.trip_no', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { items, meta: { page: query.page, limit: query.limit, total } };
  }

  async getTrip(companyId: string, id: string) {
    const trip = await this.em.findOne(VehicleTrip, { where: { id, companyId } });
    if (!trip) throw new BusinessRuleException('TRIP_NOT_FOUND', 'That trip does not exist');
    const expenses = await this.em.find(VehicleExpense, {
      where: { companyId, tripId: id },
      order: { expenseDate: 'ASC' },
    });
    return { ...trip, expenses };
  }

  async listExpenses(companyId: string, query: VehicleExpenseQueryDto) {
    const qb = this.em
      .createQueryBuilder(VehicleExpense, 'e')
      .where('e.company_id = :companyId', { companyId })
      .andWhere('e.deleted_at IS NULL');

    if (query.vehicleId) qb.andWhere('e.vehicle_id = :vehicleId', { vehicleId: query.vehicleId });
    if (query.tripId) qb.andWhere('e.trip_id = :tripId', { tripId: query.tripId });
    if (query.kind) qb.andWhere('e.kind = :kind', { kind: query.kind });
    if (query.fromDate) qb.andWhere('e.expense_date >= :fromDate', { fromDate: query.fromDate });
    if (query.toDate) qb.andWhere('e.expense_date <= :toDate', { toDate: query.toDate });

    const [items, total] = await qb
      .orderBy('e.expense_date', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { items, meta: { page: query.page, limit: query.limit, total } };
  }

  // ── VEH-07 vehicle-wise profitability ──────────────────────────────────────

  /**
   * Freight earned minus what the vehicle cost, per vehicle, over a window.
   *
   * Freight billed on a sales invoice rather than on a trip is **not** counted
   * here: that income belongs to the sale, and ADR-042 stops it being recorded
   * in both places. A vehicle whose work is always billed on the invoice
   * therefore reads as pure cost, which is the honest answer — the report says
   * what this vehicle earned *as freight*, not what the loads it carried sold for.
   */
  async vehicleProfitability(companyId: string, query: VehicleProfitabilityQueryDto) {
    if (query.toDate < query.fromDate) {
      throw new BusinessRuleException('DATE_RANGE_INVALID', 'The end of the window is before its start');
    }

    const params: unknown[] = [companyId, query.fromDate, query.toDate];
    let vehicleFilter = '';
    if (query.vehicleId) {
      params.push(query.vehicleId);
      vehicleFilter = ` AND v."id" = $${params.length}`;
    }

    const rows = await this.em.query<
      {
        vehicle_id: string;
        registration_no: string;
        owner_type: string;
        trip_count: string;
        distance_km: string;
        freight_income: string;
        diesel: string;
        maintenance: string;
        loading: string;
        hire: string;
        diesel_litres: string;
      }[]
    >(
      `
      SELECT
        v."id"   AS vehicle_id,
        v."registration_no",
        v."owner_type",
        COALESCE(t."trips", 0)::text        AS trip_count,
        COALESCE(t."distance", 0)::text     AS distance_km,
        COALESCE(t."freight", 0)::text      AS freight_income,
        COALESCE(e."diesel", 0)::text       AS diesel,
        COALESCE(e."maintenance", 0)::text  AS maintenance,
        COALESCE(e."loading", 0)::text      AS loading,
        COALESCE(e."hire", 0)::text         AS hire,
        COALESCE(e."litres", 0)::text       AS diesel_litres
      FROM "transport_vehicles" v
      LEFT JOIN LATERAL (
        SELECT count(*) AS trips,
               SUM(COALESCE(x."distance_km", 0))   AS distance,
               SUM(COALESCE(x."freight_amount", 0)) AS freight
          FROM "vehicle_trips" x
         WHERE x."vehicle_id" = v."id" AND x."deleted_at" IS NULL
           AND x."trip_date" BETWEEN $2 AND $3
      ) t ON true
      LEFT JOIN LATERAL (
        SELECT
          SUM(CASE WHEN y."kind" = 'diesel'      THEN y."amount" ELSE 0 END) AS diesel,
          SUM(CASE WHEN y."kind" = 'maintenance' THEN y."amount" ELSE 0 END) AS maintenance,
          SUM(CASE WHEN y."kind" = 'loading'     THEN y."amount" ELSE 0 END) AS loading,
          SUM(CASE WHEN y."kind" = 'hire'        THEN y."amount" ELSE 0 END) AS hire,
          SUM(CASE WHEN y."kind" = 'diesel'      THEN COALESCE(y."quantity", 0) ELSE 0 END) AS litres
          FROM "vehicle_expenses" y
         WHERE y."vehicle_id" = v."id" AND y."deleted_at" IS NULL
           AND y."expense_date" BETWEEN $2 AND $3
      ) e ON true
      WHERE v."company_id" = $1 AND v."deleted_at" IS NULL${vehicleFilter}
      ORDER BY v."registration_no"
      `,
      params,
    );

    const items = rows.map((r) => {
      const income = new Decimal(r.freight_income);
      const diesel = new Decimal(r.diesel);
      const maintenance = new Decimal(r.maintenance);
      const loading = new Decimal(r.loading);
      const hire = new Decimal(r.hire);
      const cost = diesel.plus(maintenance).plus(loading).plus(hire);
      const distance = new Decimal(r.distance_km);
      const litres = new Decimal(r.diesel_litres);
      return {
        vehicleId: r.vehicle_id,
        registrationNo: r.registration_no,
        ownerType: r.owner_type,
        tripCount: Number(r.trip_count),
        distanceKm: qty(distance),
        freightIncome: money(income),
        diesel: money(diesel),
        maintenance: money(maintenance),
        loading: money(loading),
        hire: money(hire),
        totalCost: money(cost),
        net: money(income.minus(cost)),
        /** Litres per 100 km — null until the vehicle has both numbers. */
        litresPer100Km:
          distance.greaterThan(0) && litres.greaterThan(0) ? litres.div(distance).times(100).toFixed(2) : null,
        /** Cost per km, the number an owner compares one truck against another with. */
        costPerKm: distance.greaterThan(0) ? cost.div(distance).toFixed(2) : null,
      };
    });

    const sum = (pick: (row: (typeof items)[number]) => string) =>
      money(items.reduce((acc, row) => acc.plus(pick(row)), new Decimal(0)));

    return {
      items,
      meta: {
        fromDate: query.fromDate,
        toDate: query.toDate,
        vehicleCount: items.length,
        freightIncome: sum((r) => r.freightIncome),
        totalCost: sum((r) => r.totalCost),
        net: sum((r) => r.net),
      },
    };
  }
}
