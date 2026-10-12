import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { DataSource, EntityManager, In } from 'typeorm';
import type {
  AcknowledgeDeliveryDto,
  CancelDispatchDto,
  ConfirmDispatchDto,
  CreateDispatchDto,
  DispatchQueryDto,
  GateReconciliationQueryDto,
} from '@brics/shared';
import { BusinessRuleException } from '../../common/exceptions/business-rule.exception';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { todayCalendarDate } from '../../common/time/calendar-date';
import { StockService } from '../../stock/stock.service';
import { AuditService } from '../audit/audit.service';
import { Party } from '../parties/entities/party.entity';
import { Site } from '../company/entities/site.entity';
import { Item } from '../inventory/entities/item.entity';
import { Warehouse } from '../inventory/entities/warehouse.entity';
import { Vehicle } from '../transport/entities/vehicle.entity';
import { Driver } from '../transport/entities/driver.entity';
import { LabourGroup } from '../labour/entities/labour-group.entity';
import { SalesInvoice } from '../sales/entities/sales-invoice.entity';
import { SalesOrder } from '../sales/entities/sales-order.entity';
import { Dispatch } from './entities/dispatch.entity';
import { DispatchLine } from './entities/dispatch-line.entity';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

const qty = (v: Decimal.Value): string => new Decimal(v).toFixed(3);

/**
 * A challan cannot leave the gate tomorrow (ADR-028). Every `asOf` stock report
 * would read wrong, and a mistyped year is the common entry error here.
 */
function assertNotFuture(date: string, label: string): void {
  const today = todayCalendarDate();
  if (date > today) {
    throw new BusinessRuleException('DISPATCH_DATE_IN_FUTURE', `${label} cannot be dated after today (${today})`);
  }
}

@Injectable()
export class DispatchService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly dataSource: DataSource,
    private readonly stock: StockService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
  ) {}

  // ── shared guards ──────────────────────────────────────────────────────────

  /**
   * Every id in the body is attacker-controlled (ADR-021). `company_id` comes
   * from the JWT; the rows it points at are checked here, one by one.
   */
  private async assertCustomer(manager: EntityManager, companyId: string, partyId: string): Promise<Party> {
    const party = await manager.findOne(Party, { where: { id: partyId, companyId } });
    if (!party) throw new BusinessRuleException('CUSTOMER_NOT_FOUND', 'That customer does not exist');
    if (!party.isActive) throw new BusinessRuleException('CUSTOMER_INACTIVE', `${party.name} is no longer in use`);
    if (!party.partyTypes.includes('customer')) {
      throw new BusinessRuleException('PARTY_NOT_A_CUSTOMER', `${party.name} is not marked as a customer`);
    }
    return party;
  }

  private async assertSite(manager: EntityManager, companyId: string, siteId: string): Promise<void> {
    const site = await manager.findOne(Site, { where: { id: siteId, companyId } });
    if (!site) throw new BusinessRuleException('SITE_NOT_FOUND', 'That kiln does not exist');
  }

  private async assertItems(manager: EntityManager, companyId: string, itemIds: string[]): Promise<void> {
    const unique = Array.from(new Set(itemIds));
    const found = await manager.find(Item, { where: { id: In(unique), companyId } });
    if (found.length !== unique.length) {
      throw new BusinessRuleException('ITEM_NOT_FOUND', 'One of the items does not exist in this company');
    }
    const inactive = found.find((i) => !i.isActive);
    if (inactive) throw new BusinessRuleException('ITEM_INACTIVE', `${inactive.name} is no longer in use`);
  }

  private async assertWarehouses(manager: EntityManager, companyId: string, warehouseIds: string[]): Promise<void> {
    const unique = Array.from(new Set(warehouseIds));
    const found = await manager.find(Warehouse, { where: { id: In(unique), companyId } });
    if (found.length !== unique.length) {
      throw new BusinessRuleException('WAREHOUSE_NOT_FOUND', 'One of the yards does not exist in this company');
    }
  }

  /** The optional pointers: vehicle, driver and loading group. */
  private async assertOptionalRefs(manager: EntityManager, companyId: string, dto: CreateDispatchDto): Promise<void> {
    if (dto.vehicleId) {
      const vehicle = await manager.findOne(Vehicle, { where: { id: dto.vehicleId, companyId } });
      if (!vehicle) throw new BusinessRuleException('VEHICLE_NOT_FOUND', 'That vehicle does not exist');
      if (!vehicle.isActive) {
        throw new BusinessRuleException('VEHICLE_INACTIVE', `${vehicle.registrationNo} is no longer in use`);
      }
    }
    if (dto.driverId) {
      const driver = await manager.findOne(Driver, { where: { id: dto.driverId, companyId } });
      if (!driver) throw new BusinessRuleException('DRIVER_NOT_FOUND', 'That driver does not exist');
      if (!driver.isActive) throw new BusinessRuleException('DRIVER_INACTIVE', `${driver.name} is no longer in use`);
    }
    if (dto.loadingGroupId) {
      const group = await manager.findOne(LabourGroup, { where: { id: dto.loadingGroupId, companyId } });
      if (!group) throw new BusinessRuleException('LABOUR_GROUP_NOT_FOUND', 'That loading group does not exist');
    }
  }

  /**
   * Next challan number for a company, serialised by an advisory lock
   * (ADR-027). `max + 1` on its own is a read-then-write race, and two trucks
   * leaving the gate at the same moment is the ordinary case, not the rare one.
   */
  private async nextChallanNo(manager: EntityManager, companyId: string): Promise<string> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`CHL:${companyId}`]);
    const rows = await manager.query<{ n: string | null }[]>(
      `SELECT MAX(NULLIF(regexp_replace("challan_no", '\\D', '', 'g'), '')::bigint) AS n
         FROM "dispatches" WHERE "company_id" = $1`,
      [companyId],
    );
    const next = Number(rows[0]?.n ?? 0) + 1;
    return `CHL-${String(next).padStart(5, '0')}`;
  }

  // ── DSP-01 raise a challan ─────────────────────────────────────────────────

  async createDispatch(
    companyId: string,
    userId: string,
    dto: CreateDispatchDto,
    idempotencyKey: string | null = null,
  ): Promise<Dispatch> {
    assertNotFuture(dto.dispatchDate, 'A challan');

    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        { companyId, userId, endpoint: 'POST /dispatches', key: idempotencyKey, body: dto },
        async () => {
          const customer = await this.assertCustomer(manager, companyId, dto.customerPartyId);
          await this.assertSite(manager, companyId, dto.siteId);
          await this.assertItems(
            manager,
            companyId,
            dto.lines.map((l) => l.itemId),
          );
          await this.assertWarehouses(
            manager,
            companyId,
            dto.lines.map((l) => l.warehouseId),
          );
          await this.assertOptionalRefs(manager, companyId, dto);

          if (dto.salesInvoiceId) {
            const invoice = await manager.findOne(SalesInvoice, {
              where: { id: dto.salesInvoiceId, companyId },
            });
            if (!invoice) throw new BusinessRuleException('SALES_INVOICE_NOT_FOUND', 'That invoice does not exist');
            if (invoice.customerPartyId !== dto.customerPartyId) {
              throw new BusinessRuleException(
                'INVOICE_CUSTOMER_MISMATCH',
                'That invoice belongs to a different customer',
              );
            }
            if (invoice.status === 'cancelled') {
              throw new BusinessRuleException('SALES_INVOICE_CANCELLED', 'That invoice was cancelled');
            }
          }

          if (dto.salesOrderId) {
            const order = await manager.findOne(SalesOrder, { where: { id: dto.salesOrderId, companyId } });
            if (!order) throw new BusinessRuleException('SALES_ORDER_NOT_FOUND', 'That sales order does not exist');
            if (order.customerPartyId !== dto.customerPartyId) {
              throw new BusinessRuleException(
                'SALES_ORDER_CUSTOMER_MISMATCH',
                'That sales order belongs to a different customer',
              );
            }
            if (order.status === 'cancelled') {
              throw new BusinessRuleException('SALES_ORDER_CANCELLED', 'That sales order was cancelled');
            }
          }

          const dispatch = await manager.save(
            manager.create(Dispatch, {
              companyId,
              createdBy: userId,
              updatedBy: userId,
              challanNo: await this.nextChallanNo(manager, companyId),
              siteId: dto.siteId,
              customerPartyId: dto.customerPartyId,
              salesInvoiceId: dto.salesInvoiceId ?? null,
              salesOrderId: dto.salesOrderId ?? null,
              vehicleId: dto.vehicleId ?? null,
              driverId: dto.driverId ?? null,
              loadingGroupId: dto.loadingGroupId ?? null,
              dispatchDate: dto.dispatchDate,
              loadingLocation: dto.loadingLocation ?? null,
              deliveryLocation: dto.deliveryLocation ?? null,
              status: 'draft',
              movedStock: false,
              notes: dto.notes ?? null,
            }),
          );

          for (const line of dto.lines) {
            await manager.save(
              manager.create(DispatchLine, {
                companyId,
                createdBy: userId,
                updatedBy: userId,
                dispatchId: dispatch.id,
                itemId: line.itemId,
                warehouseId: line.warehouseId,
                quantity: qty(line.quantity),
                notes: line.notes ?? null,
              }),
            );
          }

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'dispatches',
              entityId: dispatch.id,
              after: {
                challanNo: dispatch.challanNo,
                customer: customer.name,
                lines: dto.lines.length,
                salesInvoiceId: dispatch.salesInvoiceId,
              },
            },
            manager,
          );

          return dispatch;
        },
      ),
    );
  }

  // ── DSP-02 confirm: the truck leaves, and the yard knows ───────────────────

  /**
   * ADR-041: the bricks leave the yard exactly once.
   *
   * A challan raised against an invoice moves nothing — `createSalesInvoice`
   * already deducted (ADR-038). A challan with no invoice is the challan-first
   * flow (bill tomorrow, truck today), and this is the deduction. Which one
   * happened is recorded on `moved_stock` rather than inferred later.
   */
  async confirmDispatch(companyId: string, userId: string, id: string, dto: ConfirmDispatchDto): Promise<Dispatch> {
    return this.dataSource.transaction(async (manager) => {
      // Two confirms racing would deduct the yard twice. The lock is per
      // challan, so unrelated trucks are not serialised behind each other.
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`dispatch-confirm:${id}`]);

      const dispatch = await this.loadForUpdate(manager, companyId, id);
      if (dispatch.status !== 'draft') {
        throw new BusinessRuleException(
          'DISPATCH_NOT_DRAFT',
          `Challan ${dispatch.challanNo} is already ${dispatch.status}`,
        );
      }

      const confirmedOn = dto.confirmedOn ?? dispatch.dispatchDate;
      assertNotFuture(confirmedOn, 'A challan');

      const lines = await manager.find(DispatchLine, { where: { companyId, dispatchId: dispatch.id } });
      if (lines.length === 0) {
        throw new BusinessRuleException('DISPATCH_HAS_NO_LINES', 'That challan has nothing on it');
      }

      const customer = await manager.findOne(Party, { where: { id: dispatch.customerPartyId, companyId } });

      let movedStock = false;
      if (!dispatch.salesInvoiceId) {
        for (const line of lines) {
          // StockService refuses to drive the yard negative (ADR-026) under an
          // advisory lock (ADR-027). If the bricks are not there, the whole
          // confirm rolls back and the challan stays a draft.
          await this.stock.record(manager, {
            companyId,
            userId,
            warehouseId: line.warehouseId,
            itemId: line.itemId,
            movementType: 'dispatch',
            direction: 'out',
            quantity: line.quantity,
            movementDate: confirmedOn,
            sourceType: 'dispatch',
            sourceId: dispatch.id,
            notes: `Challan ${dispatch.challanNo} to ${customer?.name ?? 'customer'}`,
          });
        }
        movedStock = true;
      }

      dispatch.status = 'confirmed';
      dispatch.movedStock = movedStock;
      dispatch.confirmedAt = new Date();
      dispatch.updatedBy = userId;
      const saved = await manager.save(dispatch);

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'UPDATE',
          entityName: 'dispatches',
          entityId: saved.id,
          before: { status: 'draft' },
          after: { status: 'confirmed', movedStock, challanNo: saved.challanNo },
        },
        manager,
      );

      return saved;
    });
  }

  // ── DSP-03 the customer signs for the load ─────────────────────────────────

  async acknowledgeDelivery(
    companyId: string,
    userId: string,
    id: string,
    dto: AcknowledgeDeliveryDto,
  ): Promise<Dispatch> {
    assertNotFuture(dto.deliveredOn, 'A delivery');

    return this.dataSource.transaction(async (manager) => {
      const dispatch = await this.loadForUpdate(manager, companyId, id);
      if (dispatch.status === 'delivered') {
        throw new BusinessRuleException(
          'DISPATCH_ALREADY_DELIVERED',
          `Challan ${dispatch.challanNo} was already signed for by ${dispatch.receivedBy}`,
        );
      }
      if (dispatch.status !== 'confirmed') {
        throw new BusinessRuleException(
          'DISPATCH_NOT_CONFIRMED',
          `Challan ${dispatch.challanNo} has not left the gate yet`,
        );
      }
      // A load cannot be received before it was sent.
      if (dto.deliveredOn < dispatch.dispatchDate) {
        throw new BusinessRuleException(
          'DELIVERY_BEFORE_DISPATCH',
          `That challan left on ${dispatch.dispatchDate} — it cannot be received before then`,
        );
      }

      dispatch.status = 'delivered';
      dispatch.receivedBy = dto.receivedBy;
      dispatch.deliveredOn = dto.deliveredOn;
      dispatch.deliveryRemarks = dto.deliveryRemarks ?? null;
      dispatch.updatedBy = userId;
      const saved = await manager.save(dispatch);

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'UPDATE',
          entityName: 'dispatches',
          entityId: saved.id,
          before: { status: 'confirmed' },
          after: { status: 'delivered', receivedBy: dto.receivedBy, deliveredOn: dto.deliveredOn },
        },
        manager,
      );

      return saved;
    });
  }

  async cancelDispatch(companyId: string, userId: string, id: string, dto: CancelDispatchDto): Promise<Dispatch> {
    return this.dataSource.transaction(async (manager) => {
      const dispatch = await this.loadForUpdate(manager, companyId, id);
      if (dispatch.status !== 'draft') {
        // Undoing a confirmed challan means putting bricks back in the yard,
        // which is a stock event with its own reason — not a status flip.
        throw new BusinessRuleException(
          'DISPATCH_NOT_DRAFT',
          `Challan ${dispatch.challanNo} already left the gate — raise a sales return instead of cancelling it`,
        );
      }

      dispatch.status = 'cancelled';
      dispatch.cancelReason = dto.reason;
      dispatch.updatedBy = userId;
      const saved = await manager.save(dispatch);

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'UPDATE',
          entityName: 'dispatches',
          entityId: saved.id,
          before: { status: 'draft' },
          after: { status: 'cancelled', reason: dto.reason },
        },
        manager,
      );

      return saved;
    });
  }

  private async loadForUpdate(manager: EntityManager, companyId: string, id: string): Promise<Dispatch> {
    const dispatch = await manager.findOne(Dispatch, { where: { id, companyId } });
    if (!dispatch) throw new BusinessRuleException('DISPATCH_NOT_FOUND', 'That challan does not exist');
    return dispatch;
  }

  // ── reads ──────────────────────────────────────────────────────────────────

  async listDispatches(companyId: string, query: DispatchQueryDto) {
    const qb = this.em
      .createQueryBuilder(Dispatch, 'd')
      .where('d.company_id = :companyId', { companyId })
      .andWhere('d.deleted_at IS NULL');

    if (query.status) qb.andWhere('d.status = :status', { status: query.status });
    if (query.customerPartyId) {
      qb.andWhere('d.customer_party_id = :customerPartyId', { customerPartyId: query.customerPartyId });
    }
    if (query.vehicleId) qb.andWhere('d.vehicle_id = :vehicleId', { vehicleId: query.vehicleId });
    if (query.siteId) qb.andWhere('d.site_id = :siteId', { siteId: query.siteId });
    if (query.fromDate) qb.andWhere('d.dispatch_date >= :fromDate', { fromDate: query.fromDate });
    if (query.toDate) qb.andWhere('d.dispatch_date <= :toDate', { toDate: query.toDate });

    const [rows, total] = await qb
      .orderBy('d.dispatch_date', 'DESC')
      .addOrderBy('d.challan_no', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { items: rows, meta: { page: query.page, limit: query.limit, total } };
  }

  async getDispatch(companyId: string, id: string) {
    const dispatch = await this.em.findOne(Dispatch, { where: { id, companyId } });
    if (!dispatch) throw new BusinessRuleException('DISPATCH_NOT_FOUND', 'That challan does not exist');
    const lines = await this.em.find(DispatchLine, {
      where: { companyId, dispatchId: id },
      order: { createdAt: 'ASC' },
    });
    return { ...dispatch, lines };
  }

  // ── LEK-04 gate reconciliation ─────────────────────────────────────────────

  /**
   * "Did every truck that left the gate get billed?"
   *
   * Three numbers per challan: what left on the challan, what the linked
   * invoice billed, and what the stock ledger actually recorded. A challan with
   * no invoice on either side of the link is the leak the client cares about —
   * bricks gone, nothing to collect against.
   */
  async gateReconciliation(companyId: string, query: GateReconciliationQueryDto) {
    if (query.toDate < query.fromDate) {
      throw new BusinessRuleException('DATE_RANGE_INVALID', 'The end of the window is before its start');
    }

    const params: unknown[] = [companyId, query.fromDate, query.toDate];
    let siteFilter = '';
    if (query.siteId) {
      params.push(query.siteId);
      siteFilter = ` AND d."site_id" = $${params.length}`;
    }

    const rows = await this.em.query<
      {
        id: string;
        challan_no: string;
        dispatch_date: string;
        status: string;
        customer_name: string;
        vehicle_no: string | null;
        moved_stock: boolean;
        dispatched_qty: string;
        invoice_no: string | null;
        invoiced_qty: string | null;
        stock_qty: string;
      }[]
    >(
      `
      SELECT
        d."id",
        d."challan_no",
        -- ::text, not the bare column: the pg driver turns a date column into
        -- a JS Date, which serialises as UTC midnight and reads a day early in
        -- IST. The challan register would show every truck leaving a day early.
        d."dispatch_date"::text AS dispatch_date,
        d."status",
        p."name"  AS customer_name,
        v."registration_no" AS vehicle_no,
        d."moved_stock",
        COALESCE(dl."qty", 0)::text AS dispatched_qty,
        si."invoice_no",
        sil."qty"::text AS invoiced_qty,
        COALESCE(sm."qty", 0)::text AS stock_qty
      FROM "dispatches" d
      JOIN "parties" p ON p."id" = d."customer_party_id"
      LEFT JOIN "transport_vehicles" v ON v."id" = d."vehicle_id"
      LEFT JOIN LATERAL (
        SELECT SUM(l."quantity") AS qty FROM "dispatch_lines" l
        WHERE l."dispatch_id" = d."id" AND l."deleted_at" IS NULL
      ) dl ON true
      -- The link exists in either direction: invoice-first puts it on the
      -- challan, challan-first puts it on the invoice (ADR-041).
      LEFT JOIN "sales_invoices" si
        ON si."deleted_at" IS NULL
       AND (si."id" = d."sales_invoice_id" OR si."dispatch_id" = d."id")
      LEFT JOIN LATERAL (
        SELECT SUM(l."quantity") AS qty FROM "sales_invoice_lines" l
        WHERE l."sales_invoice_id" = si."id" AND l."deleted_at" IS NULL
      ) sil ON true
      LEFT JOIN LATERAL (
        SELECT SUM(m."quantity_out") AS qty FROM "stock_movements" m
        WHERE m."source_type" = 'dispatch' AND m."source_id" = d."id" AND m."deleted_at" IS NULL
      ) sm ON true
      WHERE d."company_id" = $1
        AND d."deleted_at" IS NULL
        AND d."status" IN ('confirmed','delivered')
        AND d."dispatch_date" BETWEEN $2 AND $3${siteFilter}
      ORDER BY d."dispatch_date" DESC, d."challan_no" DESC
      `,
      params,
    );

    const lines = rows.map((r) => {
      const dispatched = new Decimal(r.dispatched_qty);
      const invoiced = r.invoiced_qty === null ? null : new Decimal(r.invoiced_qty);
      return {
        dispatchId: r.id,
        challanNo: r.challan_no,
        dispatchDate: r.dispatch_date,
        status: r.status,
        customerName: r.customer_name,
        vehicleNo: r.vehicle_no,
        invoiceNo: r.invoice_no,
        dispatchedQuantity: qty(dispatched),
        invoicedQuantity: invoiced === null ? null : qty(invoiced),
        /** Where the deduction actually landed: this challan, or its invoice. */
        stockMovedBy: r.moved_stock ? ('dispatch' as const) : ('invoice' as const),
        stockQuantity: qty(r.stock_qty),
        /** The leak: bricks left the gate and no invoice names them. */
        unbilled: r.invoice_no === null,
        /** Billed, but not for what the truck actually carried. */
        quantityMismatch: invoiced !== null && !invoiced.equals(dispatched),
      };
    });

    const unbilled = lines.filter((l) => l.unbilled);
    const mismatched = lines.filter((l) => l.quantityMismatch);

    return {
      items: lines,
      meta: {
        fromDate: query.fromDate,
        toDate: query.toDate,
        dispatchCount: lines.length,
        dispatchedQuantity: qty(lines.reduce((a, l) => a.plus(l.dispatchedQuantity), new Decimal(0))),
        invoicedQuantity: qty(lines.reduce((a, l) => a.plus(l.invoicedQuantity ?? 0), new Decimal(0))),
        unbilledCount: unbilled.length,
        unbilledQuantity: qty(unbilled.reduce((a, l) => a.plus(l.dispatchedQuantity), new Decimal(0))),
        mismatchCount: mismatched.length,
      },
    };
  }
}
