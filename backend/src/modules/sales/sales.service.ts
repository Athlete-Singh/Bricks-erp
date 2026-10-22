import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { DataSource, EntityManager, In } from 'typeorm';
import type {
  CreateCreditNoteDto,
  CreateCustomerReceiptDto,
  CreateDebitNoteDto,
  CreateQuotationDto,
  CreateSalesInvoiceDto,
  CreateSalesOrderDto,
  CustomerReceiptQueryDto,
  QuotationQueryDto,
  QuotationStatusChangeDto,
  ReceivablesAgeingQueryDto,
  SalesChargeDto,
  SalesInvoiceQueryDto,
  SalesNoteQueryDto,
  SalesOrderQueryDto,
  SalesOrderStatusChangeDto,
} from '@brics/shared';
import { PostingService } from '../../accounting/posting.service';
import { Ledger } from '../../accounting/entities/ledger.entity';
import { BusinessRuleException } from '../../common/exceptions/business-rule.exception';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { toCalendarDate, todayCalendarDate } from '../../common/time/calendar-date';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { smsDate, smsMoney } from '../notifications/notification-templates';
import { Party } from '../parties/entities/party.entity';
import { Company } from '../company/entities/company.entity';
import { Site } from '../company/entities/site.entity';
import { Item } from '../inventory/entities/item.entity';
import { StockService } from '../../stock/stock.service';
import { Dispatch } from '../dispatch/entities/dispatch.entity';
import { StockMovement } from '../../stock/entities/stock-movement.entity';
import { Quotation } from './entities/quotation.entity';
import { QuotationLine } from './entities/quotation-line.entity';
import { SalesOrder } from './entities/sales-order.entity';
import { SalesOrderLine } from './entities/sales-order-line.entity';
import { SalesInvoice } from './entities/sales-invoice.entity';
import { SalesInvoiceLine } from './entities/sales-invoice-line.entity';
import { SalesCharge } from './entities/sales-charge.entity';
import { CustomerReceipt } from './entities/customer-receipt.entity';
import { CustomerReceiptAllocation } from './entities/customer-receipt-allocation.entity';
import { CreditNote } from './entities/credit-note.entity';
import { CreditNoteLine } from './entities/credit-note-line.entity';
import { DebitNote } from './entities/debit-note.entity';
import { DebitNoteLine } from './entities/debit-note-line.entity';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

const money = (v: Decimal.Value): string => new Decimal(v).toFixed(2);
const qty = (v: Decimal.Value): string => new Decimal(v).toFixed(3);

/**
 * Future-dated sales documents distort every `asOf` report (ADR-028) — the same
 * guard stock, production and purchases carry. A quotation can be future-dated
 * (an offer valid from next Monday), so the guard is on operational documents only.
 */
function assertNotFuture(date: string, label: string): void {
  const today = todayCalendarDate();
  if (date > today) {
    throw new BusinessRuleException('SALES_DATE_IN_FUTURE', `${label} cannot be dated after today (${today})`);
  }
}

/** Line computed from a Dto — the base math for quote/SO/invoice lines. */
interface ComputedLine {
  taxable: Decimal;
  cgst: Decimal;
  sgst: Decimal;
  igst: Decimal;
}

/**
 * Each line: (qty × rate) − discount, then CGST/SGST/IGST applied to that net.
 * Rounded to paise once at the end of the line so the invoice total is exactly
 * the sum of what the lines actually say.
 */
function computeLine(line: {
  quantity: string;
  rate: string;
  discount?: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
}): ComputedLine {
  const gross = new Decimal(line.quantity).times(line.rate);
  const taxable = gross.minus(line.discount ?? '0').toDecimalPlaces(2);
  if (taxable.isNegative()) {
    throw new BusinessRuleException(
      'SALES_LINE_DISCOUNT_EXCEEDS_VALUE',
      'A line discount cannot exceed the line value',
    );
  }
  const cgst = taxable.times(line.cgstRate).dividedBy(100).toDecimalPlaces(2);
  const sgst = taxable.times(line.sgstRate).dividedBy(100).toDecimalPlaces(2);
  const igst = taxable.times(line.igstRate).dividedBy(100).toDecimalPlaces(2);
  return { taxable, cgst, sgst, igst };
}

function computeCharge(c: SalesChargeDto): ComputedLine {
  const taxable = new Decimal(c.amount).toDecimalPlaces(2);
  const cgst = taxable.times(c.cgstRate).dividedBy(100).toDecimalPlaces(2);
  const sgst = taxable.times(c.sgstRate).dividedBy(100).toDecimalPlaces(2);
  const igst = taxable.times(c.igstRate).dividedBy(100).toDecimalPlaces(2);
  return { taxable, cgst, sgst, igst };
}

@Injectable()
export class SalesService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly dataSource: DataSource,
    private readonly stock: StockService,
    private readonly posting: PostingService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── shared guards ──────────────────────────────────────────────────────────

  /**
   * An id arriving in a request body is attacker-controlled (ADR-021).
   * `company_id` comes from the JWT, but the rows it points at must be checked.
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

  /**
   * GST-02 — the tax charged has to match where the goods are going.
   *
   * Within the state it is CGST + SGST; across a state line it is IGST.
   * Charging the wrong pair is not a rounding difference: it is tax paid to
   * the wrong government, and the kiln answers for it at filing time, with
   * interest. The invoice PDF already prints "Place of Supply … (Inter-state)"
   * off the same two state codes, so without this check the one line that
   * states it confidently is the line that is wrong.
   *
   * A party with no state recorded is treated as **intra-state**: for an
   * unregistered buyer whose address was never taken, the place of supply is
   * the supplier's own location, which is the kiln. That is the rule, and it
   * also keeps a cash counter sale from being blocked by a blank field.
   */
  private assertTaxMatchesPlaceOfSupply(
    company: Company,
    party: Party,
    rows: { cgstRate: string; sgstRate: string; igstRate: string }[],
    documentLabel: string,
  ): void {
    const interState = Boolean(party.stateCode) && party.stateCode !== company.stateCode;

    for (const row of rows) {
      const intra = new Decimal(row.cgstRate).plus(row.sgstRate);
      const igst = new Decimal(row.igstRate);

      if (interState && intra.greaterThan(0)) {
        throw new BusinessRuleException(
          'GST_PLACE_OF_SUPPLY_MISMATCH',
          `${party.name} is in state ${party.stateCode} and the kiln is in ${company.stateCode}, so this ${documentLabel} is inter-state and carries IGST, not CGST + SGST`,
        );
      }
      if (!interState && igst.greaterThan(0)) {
        throw new BusinessRuleException(
          'GST_PLACE_OF_SUPPLY_MISMATCH',
          `${party.name} and the kiln are both in state ${company.stateCode}, so this ${documentLabel} is intra-state and carries CGST + SGST, not IGST`,
        );
      }
    }
  }

  /** The company's own registration, for the place-of-supply comparison. */
  private async companyOf(manager: EntityManager, companyId: string): Promise<Company> {
    const company = await manager.findOne(Company, { where: { id: companyId } });
    if (!company) throw new BusinessRuleException('COMPANY_NOT_FOUND', 'That company does not exist');
    return company;
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

  private async ledgerByCode(manager: EntityManager, companyId: string, code: string): Promise<Ledger> {
    const ledger = await manager.findOne(Ledger, { where: { companyId, code } });
    if (!ledger) throw new NotFoundException(`Ledger ${code} is missing from this company's chart of accounts`);
    return ledger;
  }

  /**
   * Next document number for a company, serialised by an advisory lock
   * (ADR-027). `max + 1` on its own is a read-then-write race.
   */
  private async nextDocumentNo(
    manager: EntityManager,
    companyId: string,
    prefix: 'QUO' | 'SO' | 'INV' | 'CRN' | 'DBN',
    table: 'quotations' | 'sales_orders' | 'sales_invoices' | 'credit_notes' | 'debit_notes',
    column: 'quote_no' | 'order_no' | 'invoice_no' | 'note_no',
  ): Promise<string> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`${prefix}:${companyId}`]);
    const rows = await manager.query<{ n: string | null }[]>(
      `SELECT MAX(NULLIF(regexp_replace("${column}", '\\D', '', 'g'), '')::bigint) AS n
         FROM "${table}" WHERE "company_id" = $1`,
      [companyId],
    );
    const next = Number(rows[0]?.n ?? 0) + 1;
    return `${prefix}-${String(next).padStart(5, '0')}`;
  }

  // ── SAL-01 quotation ───────────────────────────────────────────────────────

  async createQuotation(
    companyId: string,
    userId: string,
    dto: CreateQuotationDto,
    idempotencyKey: string | null = null,
  ): Promise<Quotation> {
    // A quotation can be dated today or tomorrow — a quote is forward-looking.
    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        { companyId, userId, endpoint: 'POST /sales/quotations', key: idempotencyKey, body: dto },
        async () => {
          await this.assertCustomer(manager, companyId, dto.customerPartyId);
          await this.assertSite(manager, companyId, dto.siteId);
          await this.assertItems(
            manager,
            companyId,
            dto.lines.map((l) => l.itemId),
          );

          let taxable = new Decimal(0);
          let cgst = new Decimal(0);
          let sgst = new Decimal(0);
          let igst = new Decimal(0);

          const computedLines = dto.lines.map((line) => ({ line, c: computeLine(line) }));
          for (const { c } of computedLines) {
            taxable = taxable.plus(c.taxable);
            cgst = cgst.plus(c.cgst);
            sgst = sgst.plus(c.sgst);
            igst = igst.plus(c.igst);
          }
          const computedCharges = (dto.charges ?? []).map((ch) => ({ ch, c: computeCharge(ch) }));
          for (const { c } of computedCharges) {
            taxable = taxable.plus(c.taxable);
            cgst = cgst.plus(c.cgst);
            sgst = sgst.plus(c.sgst);
            igst = igst.plus(c.igst);
          }
          const total = taxable.plus(cgst).plus(sgst).plus(igst);

          const quotation = await manager.save(
            manager.create(Quotation, {
              companyId,
              createdBy: userId,
              updatedBy: userId,
              quoteNo: await this.nextDocumentNo(manager, companyId, 'QUO', 'quotations', 'quote_no'),
              customerPartyId: dto.customerPartyId,
              siteId: dto.siteId,
              quoteDate: dto.quoteDate,
              validUntil: dto.validUntil ?? null,
              status: 'draft',
              taxableAmount: money(taxable),
              cgstAmount: money(cgst),
              sgstAmount: money(sgst),
              igstAmount: money(igst),
              totalAmount: money(total),
              notes: dto.notes ?? null,
            }),
          );

          for (const { line, c } of computedLines) {
            await manager.save(
              manager.create(QuotationLine, {
                companyId,
                createdBy: userId,
                updatedBy: userId,
                quotationId: quotation.id,
                itemId: line.itemId,
                quantity: qty(line.quantity),
                rate: money(line.rate),
                discount: money(line.discount ?? '0'),
                taxableAmount: money(c.taxable),
                cgstRate: line.cgstRate,
                sgstRate: line.sgstRate,
                igstRate: line.igstRate,
                cgstAmount: money(c.cgst),
                sgstAmount: money(c.sgst),
                igstAmount: money(c.igst),
                description: line.description ?? null,
              }),
            );
          }
          for (const { ch, c } of computedCharges) {
            await manager.save(
              manager.create(SalesCharge, {
                companyId,
                createdBy: userId,
                updatedBy: userId,
                parentType: 'quotation',
                parentId: quotation.id,
                kind: ch.kind,
                label: ch.label,
                amount: money(c.taxable),
                cgstRate: ch.cgstRate,
                sgstRate: ch.sgstRate,
                igstRate: ch.igstRate,
                cgstAmount: money(c.cgst),
                sgstAmount: money(c.sgst),
                igstAmount: money(c.igst),
              }),
            );
          }

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'quotations',
              entityId: quotation.id,
              after: { quoteNo: quotation.quoteNo, totalAmount: quotation.totalAmount, lines: dto.lines.length },
            },
            manager,
          );

          return quotation;
        },
      ),
    );
  }

  /** Status machine for quotations: draft → sent → accepted / rejected / expired, any → cancelled. */
  async changeQuotationStatus(
    companyId: string,
    userId: string,
    quotationId: string,
    dto: QuotationStatusChangeDto,
  ): Promise<Quotation> {
    return this.dataSource.transaction(async (manager) => {
      const quote = await manager.findOne(Quotation, { where: { id: quotationId, companyId } });
      if (!quote) throw new NotFoundException('That quotation does not exist');
      // Terminal states: once accepted/rejected/cancelled/expired, no further changes.
      // Reopening would quietly turn a signed-off offer back into an open one.
      if (['accepted', 'rejected', 'cancelled', 'expired'].includes(quote.status)) {
        throw new BusinessRuleException(
          'QUOTATION_TERMINAL',
          `This quotation is ${quote.status} and cannot change status again`,
        );
      }
      const before = quote.status;
      quote.status = dto.status;
      quote.updatedBy = userId;
      await manager.save(quote);

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'UPDATE',
          entityName: 'quotations',
          entityId: quote.id,
          before: { status: before },
          after: { status: dto.status, reason: dto.reason ?? null },
        },
        manager,
      );
      return quote;
    });
  }

  // ── SAL-02 sales order ─────────────────────────────────────────────────────

  async createSalesOrder(
    companyId: string,
    userId: string,
    dto: CreateSalesOrderDto,
    idempotencyKey: string | null = null,
  ): Promise<SalesOrder> {
    assertNotFuture(dto.orderDate, 'A sales order');

    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        { companyId, userId, endpoint: 'POST /sales/orders', key: idempotencyKey, body: dto },
        async () => {
          await this.assertCustomer(manager, companyId, dto.customerPartyId);
          await this.assertSite(manager, companyId, dto.siteId);
          await this.assertItems(
            manager,
            companyId,
            dto.lines.map((l) => l.itemId),
          );

          if (dto.quotationId) {
            const quote = await manager.findOne(Quotation, { where: { id: dto.quotationId, companyId } });
            if (!quote) throw new BusinessRuleException('QUOTATION_NOT_FOUND', 'That quotation does not exist');
            if (quote.customerPartyId !== dto.customerPartyId) {
              throw new BusinessRuleException(
                'QUOTATION_CUSTOMER_MISMATCH',
                'That quotation belongs to a different customer',
              );
            }
            if (quote.status === 'cancelled' || quote.status === 'rejected') {
              throw new BusinessRuleException(
                'QUOTATION_NOT_OPEN',
                `That quotation is ${quote.status} and cannot be converted to an order`,
              );
            }
            // Mark the quote accepted when first converted — one order per quote
            // in CP1 depth; a quote already accepted may be re-converted (edits).
            if (quote.status !== 'accepted') {
              quote.status = 'accepted';
              quote.updatedBy = userId;
              await manager.save(quote);
            }
          }

          let taxable = new Decimal(0);
          let cgst = new Decimal(0);
          let sgst = new Decimal(0);
          let igst = new Decimal(0);
          const computedLines = dto.lines.map((line) => ({ line, c: computeLine(line) }));
          for (const { c } of computedLines) {
            taxable = taxable.plus(c.taxable);
            cgst = cgst.plus(c.cgst);
            sgst = sgst.plus(c.sgst);
            igst = igst.plus(c.igst);
          }
          const computedCharges = (dto.charges ?? []).map((ch) => ({ ch, c: computeCharge(ch) }));
          for (const { c } of computedCharges) {
            taxable = taxable.plus(c.taxable);
            cgst = cgst.plus(c.cgst);
            sgst = sgst.plus(c.sgst);
            igst = igst.plus(c.igst);
          }
          const total = taxable.plus(cgst).plus(sgst).plus(igst);

          const order = await manager.save(
            manager.create(SalesOrder, {
              companyId,
              createdBy: userId,
              updatedBy: userId,
              orderNo: await this.nextDocumentNo(manager, companyId, 'SO', 'sales_orders', 'order_no'),
              customerPartyId: dto.customerPartyId,
              siteId: dto.siteId,
              quotationId: dto.quotationId ?? null,
              orderDate: dto.orderDate,
              expectedDate: dto.expectedDate ?? null,
              status: 'open',
              taxableAmount: money(taxable),
              cgstAmount: money(cgst),
              sgstAmount: money(sgst),
              igstAmount: money(igst),
              totalAmount: money(total),
              notes: dto.notes ?? null,
            }),
          );
          for (const { line, c } of computedLines) {
            await manager.save(
              manager.create(SalesOrderLine, {
                companyId,
                createdBy: userId,
                updatedBy: userId,
                salesOrderId: order.id,
                itemId: line.itemId,
                quantity: qty(line.quantity),
                rate: money(line.rate),
                discount: money(line.discount ?? '0'),
                taxableAmount: money(c.taxable),
                cgstRate: line.cgstRate,
                sgstRate: line.sgstRate,
                igstRate: line.igstRate,
                cgstAmount: money(c.cgst),
                sgstAmount: money(c.sgst),
                igstAmount: money(c.igst),
                invoicedQuantity: '0.000',
                description: line.description ?? null,
              }),
            );
          }
          for (const { ch, c } of computedCharges) {
            await manager.save(
              manager.create(SalesCharge, {
                companyId,
                createdBy: userId,
                updatedBy: userId,
                parentType: 'sales_order',
                parentId: order.id,
                kind: ch.kind,
                label: ch.label,
                amount: money(c.taxable),
                cgstRate: ch.cgstRate,
                sgstRate: ch.sgstRate,
                igstRate: ch.igstRate,
                cgstAmount: money(c.cgst),
                sgstAmount: money(c.sgst),
                igstAmount: money(c.igst),
              }),
            );
          }

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'sales_orders',
              entityId: order.id,
              after: { orderNo: order.orderNo, totalAmount: order.totalAmount, lines: dto.lines.length },
            },
            manager,
          );
          return order;
        },
      ),
    );
  }

  async changeSalesOrderStatus(
    companyId: string,
    userId: string,
    orderId: string,
    dto: SalesOrderStatusChangeDto,
  ): Promise<SalesOrder> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(SalesOrder, { where: { id: orderId, companyId } });
      if (!order) throw new NotFoundException('That sales order does not exist');
      if (order.status === 'invoiced' || order.status === 'cancelled') {
        throw new BusinessRuleException(
          'SALES_ORDER_TERMINAL',
          `This order is ${order.status} and cannot change status again`,
        );
      }
      // Only user-controllable transitions are open/partial → cancelled.
      if (dto.status !== 'cancelled') {
        throw new BusinessRuleException(
          'SALES_ORDER_STATUS_NOT_ALLOWED',
          'Status is managed by invoicing; the only manual change is to cancel',
        );
      }
      const before = order.status;
      order.status = 'cancelled';
      order.updatedBy = userId;
      await manager.save(order);
      await this.audit.record(
        {
          companyId,
          userId,
          action: 'UPDATE',
          entityName: 'sales_orders',
          entityId: order.id,
          before: { status: before },
          after: { status: 'cancelled', reason: dto.reason ?? null },
        },
        manager,
      );
      return order;
    });
  }

  // ── SAL-03 / GST tax invoice (+ stock OUT via StockService) ────────────────

  async createSalesInvoice(
    companyId: string,
    userId: string,
    dto: CreateSalesInvoiceDto,
    idempotencyKey: string | null = null,
  ): Promise<SalesInvoice> {
    assertNotFuture(dto.invoiceDate, 'A sales invoice');

    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        { companyId, userId, endpoint: 'POST /sales/invoices', key: idempotencyKey, body: dto },
        async () => {
          const customer = await this.assertCustomer(manager, companyId, dto.customerPartyId);
          // GST-02 — the tax has to match where the goods are going.
          this.assertTaxMatchesPlaceOfSupply(
            await this.companyOf(manager, companyId),
            customer,
            [...dto.lines, ...(dto.charges ?? [])],
            'invoice',
          );
          await this.assertSite(manager, companyId, dto.siteId);
          await this.assertItems(
            manager,
            companyId,
            dto.lines.map((l) => l.itemId),
          );

          let order: SalesOrder | null = null;
          if (dto.salesOrderId) {
            order = await manager.findOne(SalesOrder, { where: { id: dto.salesOrderId, companyId } });
            if (!order) throw new BusinessRuleException('SALES_ORDER_NOT_FOUND', 'That sales order does not exist');
            if (order.status === 'cancelled') {
              throw new BusinessRuleException('SALES_ORDER_CANCELLED', 'That sales order was cancelled');
            }
            if (order.customerPartyId !== dto.customerPartyId) {
              throw new BusinessRuleException(
                'SALES_ORDER_CUSTOMER_MISMATCH',
                'That sales order belongs to a different customer',
              );
            }
          }

          // Challan-first flow (ADR-041): the truck already left and that
          // challan already emptied the yard, so this invoice bills what moved
          // rather than moving it again.
          let billedDispatch: Dispatch | null = null;
          if (dto.dispatchId) {
            billedDispatch = await manager.findOne(Dispatch, { where: { id: dto.dispatchId, companyId } });
            if (!billedDispatch) {
              throw new BusinessRuleException('DISPATCH_NOT_FOUND', 'That challan does not exist');
            }
            if (billedDispatch.customerPartyId !== dto.customerPartyId) {
              throw new BusinessRuleException(
                'DISPATCH_CUSTOMER_MISMATCH',
                'That challan belongs to a different customer',
              );
            }
            if (billedDispatch.status !== 'confirmed' && billedDispatch.status !== 'delivered') {
              throw new BusinessRuleException(
                'DISPATCH_NOT_CONFIRMED',
                `Challan ${billedDispatch.challanNo} has not left the gate yet`,
              );
            }
            if (billedDispatch.salesInvoiceId) {
              throw new BusinessRuleException(
                'DISPATCH_ALREADY_BILLED',
                `Challan ${billedDispatch.challanNo} was raised against an invoice already`,
              );
            }
            const existing = await manager.findOne(SalesInvoice, {
              where: { companyId, dispatchId: billedDispatch.id },
            });
            if (existing) {
              throw new BusinessRuleException(
                'DISPATCH_ALREADY_BILLED',
                `Challan ${billedDispatch.challanNo} is already billed on invoice ${existing.invoiceNo}`,
              );
            }
          }

          /**
           * What the challan actually moved, keyed by item + yard. The invoice
           * line points at that same movement rather than creating a second
           * one, so `sales_invoice_lines.stock_movement_id` still traces to the
           * physical event — it was just the challan that wrote it.
           */
          const dispatchedMovements = new Map<string, { movementId: string; quantity: Decimal }>();
          if (billedDispatch) {
            const moved = await manager.find(StockMovement, {
              where: { companyId, sourceType: 'dispatch', sourceId: billedDispatch.id },
            });
            for (const m of moved) {
              dispatchedMovements.set(`${m.itemId}:${m.warehouseId}`, {
                movementId: m.id,
                quantity: new Decimal(m.quantityOut),
              });
            }
          }

          // Compute totals once, from the lines — the invoice total must be the
          // sum of what the lines actually say, including rounding.
          let taxable = new Decimal(0);
          let cgst = new Decimal(0);
          let sgst = new Decimal(0);
          let igst = new Decimal(0);
          const computedLines = dto.lines.map((line) => ({ line, c: computeLine(line) }));
          for (const { c } of computedLines) {
            taxable = taxable.plus(c.taxable);
            cgst = cgst.plus(c.cgst);
            sgst = sgst.plus(c.sgst);
            igst = igst.plus(c.igst);
          }
          const computedCharges = (dto.charges ?? []).map((ch) => ({ ch, c: computeCharge(ch) }));
          for (const { c } of computedCharges) {
            taxable = taxable.plus(c.taxable);
            cgst = cgst.plus(c.cgst);
            sgst = sgst.plus(c.sgst);
            igst = igst.plus(c.igst);
          }
          const total = taxable.plus(cgst).plus(sgst).plus(igst);

          // Journal lines — Dr Customer / Cr Sales + Charge-income + Output GST.
          // Each income line sums its own slice (brick lines, loading charges,
          // transport charges, other charges) so the P&L reads each on its own row.
          const salesLedger = await this.ledgerByCode(manager, companyId, 'SALES_BRICKS');
          const linesTaxable = computedLines.reduce((acc, l) => acc.plus(l.c.taxable), new Decimal(0));

          const journal: Record<string, unknown>[] = [
            {
              ledgerId: customer.ledgerId,
              debit: money(total),
              credit: '0.00',
              siteId: dto.siteId,
              partyId: customer.id,
            },
            { ledgerId: salesLedger.id, debit: '0.00', credit: money(linesTaxable), siteId: dto.siteId },
          ];

          // Charges, bucketed by kind so each income ledger gets its one net credit.
          const buckets = new Map<string, Decimal>();
          for (const { ch, c } of computedCharges) {
            const code =
              ch.kind === 'loading'
                ? 'LOADING_INCOME'
                : ch.kind === 'transport'
                  ? 'FREIGHT_INCOME'
                  : 'OTHER_SALES_INCOME';
            buckets.set(code, (buckets.get(code) ?? new Decimal(0)).plus(c.taxable));
          }
          for (const [code, amount] of buckets) {
            if (amount.greaterThan(0)) {
              const ledger = await this.ledgerByCode(manager, companyId, code);
              journal.push({ ledgerId: ledger.id, debit: '0.00', credit: money(amount), siteId: dto.siteId });
            }
          }

          // Output GST — each component on its own ledger (ACCOUNTING_RULES).
          for (const [code, amount] of [
            ['OUTPUT_CGST', cgst],
            ['OUTPUT_SGST', sgst],
            ['OUTPUT_IGST', igst],
          ] as const) {
            if (amount.greaterThan(0)) {
              const ledger = await this.ledgerByCode(manager, companyId, code);
              journal.push({ ledgerId: ledger.id, debit: '0.00', credit: money(amount), siteId: dto.siteId });
            }
          }

          const posted = await this.posting.post(manager, {
            companyId,
            userId,
            voucherTypeCode: 'sales',
            voucherDate: dto.invoiceDate,
            siteId: dto.siteId,
            narration: `Sales to ${customer.name}`,
            sourceType: 'sales_invoice',
            lines: journal as never,
          });

          const invoice = await manager.save(
            manager.create(SalesInvoice, {
              companyId,
              createdBy: userId,
              updatedBy: userId,
              invoiceNo: posted.voucher.number,
              customerPartyId: dto.customerPartyId,
              siteId: dto.siteId,
              salesOrderId: order?.id ?? null,
              dispatchId: billedDispatch?.id ?? null,
              invoiceDate: dto.invoiceDate,
              dueDate: dto.dueDate ?? null,
              customerPoNo: dto.customerPoNo ?? null,
              taxableAmount: money(taxable),
              cgstAmount: money(cgst),
              sgstAmount: money(sgst),
              igstAmount: money(igst),
              totalAmount: money(total),
              paidAmount: '0.00',
              status: 'open',
              voucherId: posted.voucher.id,
              notes: dto.notes ?? null,
            }),
          );

          for (const { line, c } of computedLines) {
            let movementId: string;
            if (billedDispatch) {
              // The bricks already left on the challan — bill them, do not move
              // them again (ADR-041).
              const already = dispatchedMovements.get(`${line.itemId}:${line.warehouseId}`);
              if (!already) {
                throw new BusinessRuleException(
                  'LINE_NOT_ON_CHALLAN',
                  `Challan ${billedDispatch.challanNo} did not carry that grade out of that yard`,
                );
              }
              // Billing more than left the gate would sell bricks that never
              // moved. Billing less is a part-bill, which LEK-04 reports.
              if (new Decimal(line.quantity).greaterThan(already.quantity)) {
                throw new BusinessRuleException(
                  'INVOICE_EXCEEDS_CHALLAN',
                  `Challan ${billedDispatch.challanNo} carried ${already.quantity.toFixed(0)} of that grade — the invoice bills more`,
                );
              }
              movementId = already.movementId;
            } else {
              // Bricks physically leave the yard. StockService refuses to drive
              // stock below zero (ADR-026) under an advisory lock (ADR-027): if
              // what we claim to invoice is not in the yard, the whole document
              // rolls back and no number is burned.
              const movement = await this.stock.record(manager, {
                companyId,
                userId,
                warehouseId: line.warehouseId,
                itemId: line.itemId,
                movementType: 'sale',
                direction: 'out',
                quantity: qty(line.quantity),
                movementDate: dto.invoiceDate,
                sourceType: 'sales_invoice',
                sourceId: invoice.id,
                notes: `Sold to ${customer.name} on invoice ${invoice.invoiceNo}`,
              });
              movementId = movement.id;
            }

            await manager.save(
              manager.create(SalesInvoiceLine, {
                companyId,
                createdBy: userId,
                updatedBy: userId,
                salesInvoiceId: invoice.id,
                itemId: line.itemId,
                warehouseId: line.warehouseId,
                quantity: qty(line.quantity),
                rate: money(line.rate),
                discount: money(line.discount ?? '0'),
                taxableAmount: money(c.taxable),
                cgstRate: line.cgstRate,
                sgstRate: line.sgstRate,
                igstRate: line.igstRate,
                cgstAmount: money(c.cgst),
                sgstAmount: money(c.sgst),
                igstAmount: money(c.igst),
                hsnCode: line.hsnCode ?? null,
                stockMovementId: movementId,
                description: line.description ?? null,
              }),
            );
          }
          for (const { ch, c } of computedCharges) {
            await manager.save(
              manager.create(SalesCharge, {
                companyId,
                createdBy: userId,
                updatedBy: userId,
                parentType: 'sales_invoice',
                parentId: invoice.id,
                kind: ch.kind,
                label: ch.label,
                amount: money(c.taxable),
                cgstRate: ch.cgstRate,
                sgstRate: ch.sgstRate,
                igstRate: ch.igstRate,
                cgstAmount: money(c.cgst),
                sgstAmount: money(c.sgst),
                igstAmount: money(c.igst),
              }),
            );
          }

          if (order) await this.refreshOrderStatus(manager, companyId, order, dto.lines, userId);

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'sales_invoices',
              entityId: invoice.id,
              after: {
                invoiceNo: invoice.invoiceNo,
                totalAmount: invoice.totalAmount,
                voucherId: posted.voucher.id,
              },
            },
            manager,
          );

          return invoice;
        },
      ),
    );
  }

  /** Mirrors the purchases pattern: moves the SO to `partial` or `invoiced` as it fills up. */
  private async refreshOrderStatus(
    manager: EntityManager,
    companyId: string,
    order: SalesOrder,
    invoiced: { itemId: string; quantity: string }[],
    userId: string,
  ): Promise<void> {
    const lines = await manager.find(SalesOrderLine, { where: { salesOrderId: order.id, companyId } });
    for (const line of lines) {
      const got = invoiced
        .filter((r) => r.itemId === line.itemId)
        .reduce((total, r) => total.plus(r.quantity), new Decimal(0));
      if (got.greaterThan(0)) {
        line.invoicedQuantity = qty(new Decimal(line.invoicedQuantity).plus(got));
        line.updatedBy = userId;
        await manager.save(line);
      }
    }
    const complete = lines.every((l) => new Decimal(l.invoicedQuantity).greaterThanOrEqualTo(l.quantity));
    const anything = lines.some((l) => new Decimal(l.invoicedQuantity).greaterThan(0));
    order.status = complete ? 'invoiced' : anything ? 'partial' : 'open';
    order.updatedBy = userId;
    await manager.save(order);
  }

  // ── SAL-05 customer receipt ────────────────────────────────────────────────

  async createCustomerReceipt(
    companyId: string,
    userId: string,
    dto: CreateCustomerReceiptDto,
    idempotencyKey: string | null = null,
  ): Promise<CustomerReceipt> {
    assertNotFuture(dto.receiptDate, 'A receipt');

    const result = await this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        { companyId, userId, endpoint: 'POST /sales/receipts', key: idempotencyKey, body: dto },
        async () => {
          const customer = await this.assertCustomer(manager, companyId, dto.customerPartyId);
          await this.assertSite(manager, companyId, dto.siteId);

          const deposit = await manager.findOne(Ledger, { where: { id: dto.depositToLedgerId, companyId } });
          if (!deposit) throw new BusinessRuleException('LEDGER_NOT_FOUND', 'That cash or bank ledger does not exist');

          // Lock the customer's invoices for the life of this transaction —
          // two receipts allocated at the same moment would otherwise each read
          // the same `paid_amount` and together overcollect (ADR-027).
          await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
            `customer-receipt:${companyId}:${dto.customerPartyId}`,
          ]);

          let total = new Decimal(0);
          const invoices = new Map<string, SalesInvoice>();
          for (const alloc of dto.allocations) {
            if (invoices.has(alloc.invoiceId)) {
              throw new BusinessRuleException(
                'DUPLICATE_INVOICE_ALLOCATION',
                'Each invoice may appear once in a receipt — combine the amounts',
              );
            }
            const invoice = await manager.findOne(SalesInvoice, { where: { id: alloc.invoiceId, companyId } });
            if (!invoice) throw new BusinessRuleException('INVOICE_NOT_FOUND', 'One of those invoices does not exist');
            if (invoice.customerPartyId !== dto.customerPartyId) {
              throw new BusinessRuleException(
                'INVOICE_CUSTOMER_MISMATCH',
                'One of those invoices belongs to a different customer',
              );
            }
            const outstanding = new Decimal(invoice.totalAmount).minus(invoice.paidAmount);
            if (new Decimal(alloc.amount).greaterThan(outstanding)) {
              throw new BusinessRuleException(
                'ALLOCATION_EXCEEDS_OUTSTANDING',
                `Invoice ${invoice.invoiceNo} has only ${money(outstanding)} outstanding, and this allocates ${money(alloc.amount)}`,
              );
            }
            invoices.set(alloc.invoiceId, invoice);
            total = total.plus(alloc.amount);
          }

          const posted = await this.posting.post(manager, {
            companyId,
            userId,
            voucherTypeCode: 'receipt',
            voucherDate: dto.receiptDate,
            siteId: dto.siteId,
            narration: `Received from ${customer.name} by ${dto.mode}${dto.reference ? ` (${dto.reference})` : ''}`,
            sourceType: 'customer_receipt',
            lines: [
              { ledgerId: deposit.id, debit: money(total), credit: '0.00', siteId: dto.siteId },
              {
                ledgerId: customer.ledgerId,
                debit: '0.00',
                credit: money(total),
                siteId: dto.siteId,
                partyId: customer.id,
              },
            ],
          });

          const receipt = await manager.save(
            manager.create(CustomerReceipt, {
              companyId,
              createdBy: userId,
              updatedBy: userId,
              customerPartyId: dto.customerPartyId,
              siteId: dto.siteId,
              receiptDate: dto.receiptDate,
              mode: dto.mode,
              depositToLedgerId: deposit.id,
              amount: money(total),
              reference: dto.reference ?? null,
              voucherId: posted.voucher.id,
              notes: dto.notes ?? null,
            }),
          );

          for (const alloc of dto.allocations) {
            const invoice = invoices.get(alloc.invoiceId)!;
            invoice.paidAmount = money(new Decimal(invoice.paidAmount).plus(alloc.amount));
            invoice.status = new Decimal(invoice.paidAmount).greaterThanOrEqualTo(invoice.totalAmount)
              ? 'paid'
              : 'partial';
            invoice.updatedBy = userId;
            await manager.save(invoice);

            await manager.save(
              manager.create(CustomerReceiptAllocation, {
                companyId,
                createdBy: userId,
                updatedBy: userId,
                customerReceiptId: receipt.id,
                salesInvoiceId: alloc.invoiceId,
                amount: money(alloc.amount),
              }),
            );
          }

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'customer_receipts',
              entityId: receipt.id,
              after: { amount: receipt.amount, invoices: dto.allocations.length, voucherId: posted.voucher.id },
            },
            manager,
          );

          // NTF-01 — the customer gets a receipt by SMS (if the company has it on).
          await this.notifications.enqueue(manager, {
            companyId,
            event: 'payment_received',
            to: { phone: customer.phone },
            variables: {
              amount: smsMoney(receipt.amount),
              date: smsDate(receipt.receiptDate),
              receipt: posted.voucher.number,
            },
            sourceType: 'customer_receipt',
            sourceId: receipt.id,
          });

          return receipt;
        },
      ),
    );
    this.notifications.kick(companyId);
    return result;
  }

  // ── SAL-06 credit note (value and/or stock) ────────────────────────────────

  async createCreditNote(
    companyId: string,
    userId: string,
    dto: CreateCreditNoteDto,
    idempotencyKey: string | null = null,
  ): Promise<CreditNote> {
    assertNotFuture(dto.noteDate, 'A credit note');

    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        { companyId, userId, endpoint: 'POST /sales/credit-notes', key: idempotencyKey, body: dto },
        async () => {
          const customer = await this.assertCustomer(manager, companyId, dto.customerPartyId);
          // GST-02 — the tax has to match where the goods are going.
          this.assertTaxMatchesPlaceOfSupply(
            await this.companyOf(manager, companyId),
            customer,
            dto.lines,
            'credit note',
          );
          await this.assertSite(manager, companyId, dto.siteId);
          await this.assertItems(
            manager,
            companyId,
            dto.lines.map((l) => l.itemId),
          );

          if (dto.invoiceId) {
            const invoice = await manager.findOne(SalesInvoice, { where: { id: dto.invoiceId, companyId } });
            if (!invoice) throw new BusinessRuleException('INVOICE_NOT_FOUND', 'That invoice does not exist');
            if (invoice.customerPartyId !== dto.customerPartyId) {
              throw new BusinessRuleException(
                'INVOICE_CUSTOMER_MISMATCH',
                'That invoice belongs to a different customer',
              );
            }
          }

          let taxable = new Decimal(0);
          let tax = new Decimal(0);
          const computed = dto.lines.map((line) => {
            const quantityPart = line.quantity ? new Decimal(line.quantity).times(line.rate) : new Decimal(line.rate);
            // A value-only line (no quantity) uses `rate` as the net adjustment.
            const taxableLine = quantityPart.toDecimalPlaces(2);
            const rate = new Decimal(line.cgstRate).plus(line.sgstRate).plus(line.igstRate);
            const taxLine = taxableLine.times(rate).dividedBy(100).toDecimalPlaces(2);
            taxable = taxable.plus(taxableLine);
            tax = tax.plus(taxLine);
            return { line, taxableLine, taxLine };
          });
          const total = taxable.plus(tax);
          const restocked = dto.lines.some((l) => l.quantity && Number(l.quantity) > 0);

          // Journal — mirror of a sale: Dr Sales Returns + Output GST, Cr Customer.
          const salesReturns = await this.ledgerByCode(manager, companyId, 'SALES_RETURNS');
          const journal: Record<string, unknown>[] = [
            { ledgerId: salesReturns.id, debit: money(taxable), credit: '0.00', siteId: dto.siteId },
          ];
          if (tax.greaterThan(0)) {
            // Same GST split the invoice used — intra-state is CGST + SGST, inter-state IGST.
            const anyIgst = dto.lines.some((l) => Number(l.igstRate) > 0);
            if (anyIgst) {
              const l = await this.ledgerByCode(manager, companyId, 'OUTPUT_IGST');
              journal.push({ ledgerId: l.id, debit: money(tax), credit: '0.00', siteId: dto.siteId });
            } else {
              const half = tax.dividedBy(2).toDecimalPlaces(2);
              const cgstL = await this.ledgerByCode(manager, companyId, 'OUTPUT_CGST');
              const sgstL = await this.ledgerByCode(manager, companyId, 'OUTPUT_SGST');
              journal.push({ ledgerId: cgstL.id, debit: money(half), credit: '0.00', siteId: dto.siteId });
              journal.push({ ledgerId: sgstL.id, debit: money(tax.minus(half)), credit: '0.00', siteId: dto.siteId });
            }
          }
          journal.push({
            ledgerId: customer.ledgerId,
            debit: '0.00',
            credit: money(total),
            siteId: dto.siteId,
            partyId: customer.id,
          });

          const posted = await this.posting.post(manager, {
            companyId,
            userId,
            voucherTypeCode: 'credit_note',
            voucherDate: dto.noteDate,
            siteId: dto.siteId,
            narration: `Credit to ${customer.name}: ${dto.reason}`,
            sourceType: 'credit_note',
            lines: journal as never,
          });

          const note = await manager.save(
            manager.create(CreditNote, {
              companyId,
              createdBy: userId,
              updatedBy: userId,
              noteNo: await this.nextDocumentNo(manager, companyId, 'CRN', 'credit_notes', 'note_no'),
              customerPartyId: dto.customerPartyId,
              siteId: dto.siteId,
              invoiceId: dto.invoiceId ?? null,
              noteDate: dto.noteDate,
              reason: dto.reason,
              taxableAmount: money(taxable),
              taxAmount: money(tax),
              totalAmount: money(total),
              restocked,
              voucherId: posted.voucher.id,
            }),
          );

          for (const c of computed) {
            let movementId: string | null = null;
            if (c.line.quantity && Number(c.line.quantity) > 0 && c.line.warehouseId) {
              // Bricks are physically coming back — stock IN in the same tx (OQ #19).
              const movement = await this.stock.record(manager, {
                companyId,
                userId,
                warehouseId: c.line.warehouseId,
                itemId: c.line.itemId,
                movementType: 'sale',
                direction: 'in',
                quantity: qty(c.line.quantity),
                movementDate: dto.noteDate,
                sourceType: 'credit_note',
                sourceId: note.id,
                notes: `Returned by ${customer.name}: ${dto.reason}`,
              });
              movementId = movement.id;
            }
            await manager.save(
              manager.create(CreditNoteLine, {
                companyId,
                createdBy: userId,
                updatedBy: userId,
                creditNoteId: note.id,
                itemId: c.line.itemId,
                warehouseId: c.line.warehouseId ?? null,
                quantity: c.line.quantity ? qty(c.line.quantity) : null,
                rate: money(c.line.rate),
                taxableAmount: money(c.taxableLine),
                cgstRate: c.line.cgstRate,
                sgstRate: c.line.sgstRate,
                igstRate: c.line.igstRate,
                taxAmount: money(c.taxLine),
                stockMovementId: movementId,
                description: c.line.description ?? null,
              }),
            );
          }

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'credit_notes',
              entityId: note.id,
              after: { noteNo: note.noteNo, totalAmount: note.totalAmount, restocked, voucherId: posted.voucher.id },
            },
            manager,
          );
          return note;
        },
      ),
    );
  }

  // ── SAL-06 debit note (customer owes more) ─────────────────────────────────

  async createDebitNote(
    companyId: string,
    userId: string,
    dto: CreateDebitNoteDto,
    idempotencyKey: string | null = null,
  ): Promise<DebitNote> {
    assertNotFuture(dto.noteDate, 'A debit note');

    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        { companyId, userId, endpoint: 'POST /sales/debit-notes', key: idempotencyKey, body: dto },
        async () => {
          const customer = await this.assertCustomer(manager, companyId, dto.customerPartyId);
          // GST-02 — the tax has to match where the goods are going.
          this.assertTaxMatchesPlaceOfSupply(
            await this.companyOf(manager, companyId),
            customer,
            dto.lines,
            'debit note',
          );
          await this.assertSite(manager, companyId, dto.siteId);
          await this.assertItems(
            manager,
            companyId,
            dto.lines.map((l) => l.itemId),
          );
          if (dto.invoiceId) {
            const invoice = await manager.findOne(SalesInvoice, { where: { id: dto.invoiceId, companyId } });
            if (!invoice) throw new BusinessRuleException('INVOICE_NOT_FOUND', 'That invoice does not exist');
            if (invoice.customerPartyId !== dto.customerPartyId) {
              throw new BusinessRuleException(
                'INVOICE_CUSTOMER_MISMATCH',
                'That invoice belongs to a different customer',
              );
            }
          }

          let taxable = new Decimal(0);
          let tax = new Decimal(0);
          const computed = dto.lines.map((line) => {
            const taxableLine = (
              line.quantity ? new Decimal(line.quantity).times(line.rate) : new Decimal(line.rate)
            ).toDecimalPlaces(2);
            const rate = new Decimal(line.cgstRate).plus(line.sgstRate).plus(line.igstRate);
            const taxLine = taxableLine.times(rate).dividedBy(100).toDecimalPlaces(2);
            taxable = taxable.plus(taxableLine);
            tax = tax.plus(taxLine);
            return { line, taxableLine, taxLine };
          });
          const total = taxable.plus(tax);

          const salesLedger = await this.ledgerByCode(manager, companyId, 'SALES_BRICKS');
          const journal: Record<string, unknown>[] = [
            {
              ledgerId: customer.ledgerId,
              debit: money(total),
              credit: '0.00',
              siteId: dto.siteId,
              partyId: customer.id,
            },
            { ledgerId: salesLedger.id, debit: '0.00', credit: money(taxable), siteId: dto.siteId },
          ];
          if (tax.greaterThan(0)) {
            const anyIgst = dto.lines.some((l) => Number(l.igstRate) > 0);
            if (anyIgst) {
              const l = await this.ledgerByCode(manager, companyId, 'OUTPUT_IGST');
              journal.push({ ledgerId: l.id, debit: '0.00', credit: money(tax), siteId: dto.siteId });
            } else {
              const half = tax.dividedBy(2).toDecimalPlaces(2);
              const cgstL = await this.ledgerByCode(manager, companyId, 'OUTPUT_CGST');
              const sgstL = await this.ledgerByCode(manager, companyId, 'OUTPUT_SGST');
              journal.push({ ledgerId: cgstL.id, debit: '0.00', credit: money(half), siteId: dto.siteId });
              journal.push({ ledgerId: sgstL.id, debit: '0.00', credit: money(tax.minus(half)), siteId: dto.siteId });
            }
          }

          const posted = await this.posting.post(manager, {
            companyId,
            userId,
            voucherTypeCode: 'debit_note',
            voucherDate: dto.noteDate,
            siteId: dto.siteId,
            narration: `Debit to ${customer.name}: ${dto.reason}`,
            sourceType: 'debit_note',
            lines: journal as never,
          });

          const note = await manager.save(
            manager.create(DebitNote, {
              companyId,
              createdBy: userId,
              updatedBy: userId,
              noteNo: await this.nextDocumentNo(manager, companyId, 'DBN', 'debit_notes', 'note_no'),
              customerPartyId: dto.customerPartyId,
              siteId: dto.siteId,
              invoiceId: dto.invoiceId ?? null,
              noteDate: dto.noteDate,
              reason: dto.reason,
              taxableAmount: money(taxable),
              taxAmount: money(tax),
              totalAmount: money(total),
              voucherId: posted.voucher.id,
            }),
          );
          for (const c of computed) {
            await manager.save(
              manager.create(DebitNoteLine, {
                companyId,
                createdBy: userId,
                updatedBy: userId,
                debitNoteId: note.id,
                itemId: c.line.itemId,
                quantity: c.line.quantity ? qty(c.line.quantity) : null,
                rate: money(c.line.rate),
                taxableAmount: money(c.taxableLine),
                cgstRate: c.line.cgstRate,
                sgstRate: c.line.sgstRate,
                igstRate: c.line.igstRate,
                taxAmount: money(c.taxLine),
                description: c.line.description ?? null,
              }),
            );
          }

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'debit_notes',
              entityId: note.id,
              after: { noteNo: note.noteNo, totalAmount: note.totalAmount, voucherId: posted.voucher.id },
            },
            manager,
          );
          return note;
        },
      ),
    );
  }

  // ── reads ──────────────────────────────────────────────────────────────────

  async listQuotations(companyId: string, query: QuotationQueryDto) {
    const qb = this.em.createQueryBuilder(Quotation, 'q').where('q.company_id = :companyId', { companyId });
    if (query.customerPartyId) qb.andWhere('q.customer_party_id = :c', { c: query.customerPartyId });
    if (query.siteId) qb.andWhere('q.site_id = :s', { s: query.siteId });
    if (query.status) qb.andWhere('q.status = :st', { st: query.status });
    if (query.from) qb.andWhere('q.quote_date >= :from', { from: query.from });
    if (query.to) qb.andWhere('q.quote_date <= :to', { to: query.to });
    const total = await qb.getCount();
    const items = await qb
      .orderBy('q.quote_date', 'DESC')
      .addOrderBy('q.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();
    return { items, meta: { page: query.page, limit: query.limit, total } };
  }

  async getQuotation(companyId: string, id: string) {
    const quote = await this.em.findOne(Quotation, { where: { id, companyId } });
    if (!quote) throw new NotFoundException('That quotation does not exist');
    const lines = await this.em.find(QuotationLine, { where: { quotationId: id, companyId } });
    const charges = await this.em.find(SalesCharge, {
      where: { parentType: 'quotation', parentId: id, companyId },
    });
    return { quote, lines, charges };
  }

  async listSalesOrders(companyId: string, query: SalesOrderQueryDto) {
    const qb = this.em.createQueryBuilder(SalesOrder, 'o').where('o.company_id = :companyId', { companyId });
    if (query.customerPartyId) qb.andWhere('o.customer_party_id = :c', { c: query.customerPartyId });
    if (query.siteId) qb.andWhere('o.site_id = :s', { s: query.siteId });
    if (query.status) qb.andWhere('o.status = :st', { st: query.status });
    if (query.from) qb.andWhere('o.order_date >= :from', { from: query.from });
    if (query.to) qb.andWhere('o.order_date <= :to', { to: query.to });
    const total = await qb.getCount();
    const items = await qb
      .orderBy('o.order_date', 'DESC')
      .addOrderBy('o.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();
    return { items, meta: { page: query.page, limit: query.limit, total } };
  }

  async getSalesOrder(companyId: string, id: string) {
    const order = await this.em.findOne(SalesOrder, { where: { id, companyId } });
    if (!order) throw new NotFoundException('That sales order does not exist');
    const lines = await this.em.find(SalesOrderLine, { where: { salesOrderId: id, companyId } });
    const charges = await this.em.find(SalesCharge, {
      where: { parentType: 'sales_order', parentId: id, companyId },
    });
    return { order, lines, charges };
  }

  async listSalesInvoices(companyId: string, query: SalesInvoiceQueryDto) {
    const qb = this.em.createQueryBuilder(SalesInvoice, 'i').where('i.company_id = :companyId', { companyId });
    if (query.customerPartyId) qb.andWhere('i.customer_party_id = :c', { c: query.customerPartyId });
    if (query.siteId) qb.andWhere('i.site_id = :s', { s: query.siteId });
    if (query.status) qb.andWhere('i.status = :st', { st: query.status });
    if (query.unpaidOnly) qb.andWhere('i.paid_amount < i.total_amount');
    if (query.from) qb.andWhere('i.invoice_date >= :from', { from: query.from });
    if (query.to) qb.andWhere('i.invoice_date <= :to', { to: query.to });
    const total = await qb.getCount();
    const items = await qb
      .orderBy('i.invoice_date', 'DESC')
      .addOrderBy('i.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();
    return { items, meta: { page: query.page, limit: query.limit, total } };
  }

  async getSalesInvoice(companyId: string, id: string) {
    const invoice = await this.em.findOne(SalesInvoice, { where: { id, companyId } });
    if (!invoice) throw new NotFoundException('That invoice does not exist');
    const lines = await this.em.find(SalesInvoiceLine, { where: { salesInvoiceId: id, companyId } });
    const charges = await this.em.find(SalesCharge, {
      where: { parentType: 'sales_invoice', parentId: id, companyId },
    });
    const allocations = await this.em.find(CustomerReceiptAllocation, {
      where: { salesInvoiceId: id, companyId },
    });
    return { invoice, lines, charges, allocations };
  }

  async listCustomerReceipts(companyId: string, query: CustomerReceiptQueryDto) {
    const qb = this.em.createQueryBuilder(CustomerReceipt, 'r').where('r.company_id = :companyId', { companyId });
    if (query.customerPartyId) qb.andWhere('r.customer_party_id = :c', { c: query.customerPartyId });
    if (query.siteId) qb.andWhere('r.site_id = :s', { s: query.siteId });
    if (query.from) qb.andWhere('r.receipt_date >= :from', { from: query.from });
    if (query.to) qb.andWhere('r.receipt_date <= :to', { to: query.to });
    const total = await qb.getCount();
    const items = await qb
      .orderBy('r.receipt_date', 'DESC')
      .addOrderBy('r.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();
    return { items, meta: { page: query.page, limit: query.limit, total } };
  }

  async listCreditNotes(companyId: string, query: SalesNoteQueryDto) {
    const qb = this.em.createQueryBuilder(CreditNote, 'n').where('n.company_id = :companyId', { companyId });
    if (query.customerPartyId) qb.andWhere('n.customer_party_id = :c', { c: query.customerPartyId });
    if (query.invoiceId) qb.andWhere('n.invoice_id = :i', { i: query.invoiceId });
    if (query.from) qb.andWhere('n.note_date >= :from', { from: query.from });
    if (query.to) qb.andWhere('n.note_date <= :to', { to: query.to });
    const total = await qb.getCount();
    const items = await qb
      .orderBy('n.note_date', 'DESC')
      .addOrderBy('n.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();
    return { items, meta: { page: query.page, limit: query.limit, total } };
  }

  async listDebitNotes(companyId: string, query: SalesNoteQueryDto) {
    const qb = this.em.createQueryBuilder(DebitNote, 'n').where('n.company_id = :companyId', { companyId });
    if (query.customerPartyId) qb.andWhere('n.customer_party_id = :c', { c: query.customerPartyId });
    if (query.invoiceId) qb.andWhere('n.invoice_id = :i', { i: query.invoiceId });
    if (query.from) qb.andWhere('n.note_date >= :from', { from: query.from });
    if (query.to) qb.andWhere('n.note_date <= :to', { to: query.to });
    const total = await qb.getCount();
    const items = await qb
      .orderBy('n.note_date', 'DESC')
      .addOrderBy('n.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();
    return { items, meta: { page: query.page, limit: query.limit, total } };
  }

  /**
   * SAL-07 — receivables ageing, bucketed by how long each unpaid invoice has
   * been due. Mirrors payables ageing in purchases — the Trial Balance uses
   * the same `asOf` convention, and so does payables ageing (ADR-028).
   */
  async receivablesAgeing(companyId: string, query: ReceivablesAgeingQueryDto) {
    const asOf = query.asOf ?? todayCalendarDate();

    const qb = this.em
      .createQueryBuilder(SalesInvoice, 'i')
      .innerJoin(Party, 'p', 'p.id = i.customer_party_id')
      .where('i.company_id = :companyId', { companyId })
      .andWhere('i.deleted_at IS NULL')
      .andWhere('i.paid_amount < i.total_amount')
      .andWhere('i.invoice_date <= :asOf', { asOf });
    if (query.customerPartyId) qb.andWhere('i.customer_party_id = :c', { c: query.customerPartyId });
    if (query.siteId) qb.andWhere('i.site_id = :s', { s: query.siteId });

    const rows = await qb
      .select('i.customer_party_id', 'customerPartyId')
      .addSelect('p.name', 'customerName')
      .addSelect('i.id', 'invoiceId')
      .addSelect('i.invoice_no', 'invoiceNo')
      .addSelect('i.invoice_date', 'invoiceDate')
      .addSelect('i.due_date', 'dueDate')
      .addSelect('i.total_amount', 'totalAmount')
      .addSelect('i.paid_amount', 'paidAmount')
      .addSelect('(:asOf::date - COALESCE(i.due_date, i.invoice_date))', 'daysOverdue')
      .setParameter('asOf', asOf)
      .orderBy('p.name', 'ASC')
      .addOrderBy('i.invoice_date', 'ASC')
      .getRawMany<{
        customerPartyId: string;
        customerName: string;
        invoiceId: string;
        invoiceNo: string;
        invoiceDate: string | Date;
        dueDate: string | Date | null;
        totalAmount: string;
        paidAmount: string;
        daysOverdue: string;
      }>();

    const BUCKETS = ['current', 'd1_30', 'd31_60', 'd61_90', 'd90_plus'] as const;
    const bucketOf = (days: number): (typeof BUCKETS)[number] =>
      days <= 0 ? 'current' : days <= 30 ? 'd1_30' : days <= 60 ? 'd31_60' : days <= 90 ? 'd61_90' : 'd90_plus';

    const byCustomer = new Map<
      string,
      {
        customerPartyId: string;
        customerName: string;
        outstanding: Decimal;
        buckets: Record<(typeof BUCKETS)[number], Decimal>;
        invoices: {
          invoiceId: string;
          invoiceNo: string;
          invoiceDate: string;
          dueDate: string | null;
          outstanding: string;
          daysOverdue: number;
          bucket: string;
        }[];
      }
    >();
    const totals: Record<string, Decimal> = Object.fromEntries(BUCKETS.map((b) => [b, new Decimal(0)]));

    for (const r of rows) {
      const outstanding = new Decimal(r.totalAmount).minus(r.paidAmount);
      const days = Number(r.daysOverdue ?? 0);
      const bucket = bucketOf(days);

      let entry = byCustomer.get(r.customerPartyId);
      if (!entry) {
        entry = {
          customerPartyId: r.customerPartyId,
          customerName: r.customerName,
          outstanding: new Decimal(0),
          buckets: Object.fromEntries(BUCKETS.map((b) => [b, new Decimal(0)])) as never,
          invoices: [],
        };
        byCustomer.set(r.customerPartyId, entry);
      }
      entry.outstanding = entry.outstanding.plus(outstanding);
      entry.buckets[bucket] = entry.buckets[bucket].plus(outstanding);
      totals[bucket] = totals[bucket]!.plus(outstanding);
      entry.invoices.push({
        invoiceId: r.invoiceId,
        invoiceNo: r.invoiceNo,
        invoiceDate: toCalendarDate(r.invoiceDate),
        dueDate: r.dueDate ? toCalendarDate(r.dueDate) : null,
        outstanding: money(outstanding),
        daysOverdue: days,
        bucket,
      });
    }

    const customers = [...byCustomer.values()].map((e) => ({
      customerPartyId: e.customerPartyId,
      customerName: e.customerName,
      outstanding: money(e.outstanding),
      buckets: Object.fromEntries(BUCKETS.map((b) => [b, money(e.buckets[b])])),
      invoices: e.invoices,
    }));
    return {
      asOf,
      customers,
      totals: {
        ...Object.fromEntries(BUCKETS.map((b) => [b, money(totals[b]!)])),
        outstanding: money(BUCKETS.reduce((acc, b) => acc.plus(totals[b]!), new Decimal(0))),
      },
    };
  }
}
