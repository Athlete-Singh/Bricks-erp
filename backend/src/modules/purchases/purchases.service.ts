import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { DataSource, EntityManager, In } from 'typeorm';
import type {
  GrnQueryDto,
  PayablesAgeingQueryDto,
  PurchaseBillQueryDto,
  PurchaseOrderQueryDto,
  CreateGrnDto,
  CreatePurchaseBillDto,
  CreatePurchaseOrderDto,
  CreatePurchaseReturnDto,
  CreateSupplierPaymentDto,
} from '@brics/shared';
import { PostingService } from '../../accounting/posting.service';
import { Ledger } from '../../accounting/entities/ledger.entity';
import { BusinessRuleException } from '../../common/exceptions/business-rule.exception';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { toCalendarDate, todayCalendarDate } from '../../common/time/calendar-date';
import { AuditService } from '../audit/audit.service';
import { Party } from '../parties/entities/party.entity';
import { Site } from '../company/entities/site.entity';
import { Item } from '../inventory/entities/item.entity';
import { StockService } from '../../stock/stock.service';
import { GoodsReceipt } from './entities/goods-receipt.entity';
import { GoodsReceiptLine } from './entities/goods-receipt-line.entity';
import { PurchaseBill } from './entities/purchase-bill.entity';
import { PurchaseBillLine } from './entities/purchase-bill-line.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity';
import { PurchaseReturn } from './entities/purchase-return.entity';
import { PurchaseReturnLine } from './entities/purchase-return-line.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { SupplierPaymentAllocation } from './entities/supplier-payment-allocation.entity';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

const money = (v: Decimal.Value): string => new Decimal(v).toFixed(2);
const qty = (v: Decimal.Value): string => new Decimal(v).toFixed(3);

/**
 * Nothing in a purchase can be dated tomorrow. The same guard stock and
 * production already carry (ADR-028): a mistyped year would not fail anywhere
 * visible, it would quietly misfile every report that buckets by date.
 */
function assertNotFuture(date: string, label: string): void {
  const today = todayCalendarDate();
  if (date > today) {
    throw new BusinessRuleException('PURCHASE_DATE_IN_FUTURE', `${label} cannot be dated after today (${today})`);
  }
}

@Injectable()
export class PurchasesService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly dataSource: DataSource,
    private readonly stock: StockService,
    private readonly posting: PostingService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
  ) {}

  // ── shared guards ──────────────────────────────────────────────────────────

  /**
   * An id arriving in a request body is attacker-controlled (ADR-021).
   * `company_id` comes from the JWT, but the rows it points at must be checked.
   */
  private async assertSupplier(manager: EntityManager, companyId: string, partyId: string): Promise<Party> {
    const party = await manager.findOne(Party, { where: { id: partyId, companyId } });
    if (!party) throw new BusinessRuleException('SUPPLIER_NOT_FOUND', 'That supplier does not exist');
    if (!party.isActive) throw new BusinessRuleException('SUPPLIER_INACTIVE', `${party.name} is no longer in use`);
    if (!party.partyTypes.includes('supplier')) {
      throw new BusinessRuleException('PARTY_NOT_A_SUPPLIER', `${party.name} is not marked as a supplier`);
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

  private async ledgerByCode(manager: EntityManager, companyId: string, code: string): Promise<Ledger> {
    const ledger = await manager.findOne(Ledger, { where: { companyId, code } });
    if (!ledger) throw new NotFoundException(`Ledger ${code} is missing from this company's chart of accounts`);
    return ledger;
  }

  /**
   * Next document number for a company, serialised by an advisory lock.
   *
   * `max + 1` on its own is a read-then-write race; two receipts booked at the
   * same moment would both compute the same number and one would die on the
   * unique index. The lock makes them queue instead (ADR-027).
   */
  private async nextDocumentNo(
    manager: EntityManager,
    companyId: string,
    prefix: 'PO' | 'GRN',
    table: 'purchase_orders' | 'goods_receipts',
    column: 'order_no' | 'grn_no',
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

  // ── PUR-01 purchase order ──────────────────────────────────────────────────

  async createPurchaseOrder(
    companyId: string,
    userId: string,
    dto: CreatePurchaseOrderDto,
    idempotencyKey: string | null = null,
  ): Promise<PurchaseOrder> {
    assertNotFuture(dto.orderDate, 'A purchase order');

    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        { companyId, userId, endpoint: 'POST /purchases/orders', key: idempotencyKey, body: dto },
        async () => {
          await this.assertSupplier(manager, companyId, dto.supplierPartyId);
          await this.assertSite(manager, companyId, dto.siteId);
          await this.assertItems(
            manager,
            companyId,
            dto.lines.map((l) => l.itemId),
          );

          const order = await manager.save(
            manager.create(PurchaseOrder, {
              companyId,
              createdBy: userId,
              updatedBy: userId,
              orderNo: await this.nextDocumentNo(manager, companyId, 'PO', 'purchase_orders', 'order_no'),
              supplierPartyId: dto.supplierPartyId,
              siteId: dto.siteId,
              orderDate: dto.orderDate,
              expectedDate: dto.expectedDate ?? null,
              status: 'open',
              notes: dto.notes ?? null,
            }),
          );

          for (const line of dto.lines) {
            await manager.save(
              manager.create(PurchaseOrderLine, {
                companyId,
                createdBy: userId,
                updatedBy: userId,
                purchaseOrderId: order.id,
                itemId: line.itemId,
                quantity: qty(line.quantity),
                rate: money(line.rate),
                receivedQuantity: '0.000',
              }),
            );
          }

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'purchase_orders',
              entityId: order.id,
              after: { orderNo: order.orderNo, supplierPartyId: dto.supplierPartyId, lines: dto.lines.length },
            },
            manager,
          );

          return order;
        },
      ),
    );
  }

  // ── PUR-02 goods receipt → stock IN (INV-05) ───────────────────────────────

  async createGoodsReceipt(
    companyId: string,
    userId: string,
    dto: CreateGrnDto,
    idempotencyKey: string | null = null,
  ): Promise<GoodsReceipt> {
    assertNotFuture(dto.receiptDate, 'A goods receipt');

    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        { companyId, userId, endpoint: 'POST /purchases/goods-receipts', key: idempotencyKey, body: dto },
        async () => {
          const supplier = await this.assertSupplier(manager, companyId, dto.supplierPartyId);
          await this.assertSite(manager, companyId, dto.siteId);
          await this.assertItems(
            manager,
            companyId,
            dto.lines.map((l) => l.itemId),
          );

          let order: PurchaseOrder | null = null;
          if (dto.purchaseOrderId) {
            order = await manager.findOne(PurchaseOrder, { where: { id: dto.purchaseOrderId, companyId } });
            if (!order)
              throw new BusinessRuleException('PURCHASE_ORDER_NOT_FOUND', 'That purchase order does not exist');
            if (order.status === 'cancelled') {
              throw new BusinessRuleException('PURCHASE_ORDER_CANCELLED', 'That purchase order was cancelled');
            }
            if (order.supplierPartyId !== dto.supplierPartyId) {
              throw new BusinessRuleException(
                'PURCHASE_ORDER_SUPPLIER_MISMATCH',
                'That purchase order belongs to a different supplier',
              );
            }
          }

          const receipt = await manager.save(
            manager.create(GoodsReceipt, {
              companyId,
              createdBy: userId,
              updatedBy: userId,
              grnNo: await this.nextDocumentNo(manager, companyId, 'GRN', 'goods_receipts', 'grn_no'),
              supplierPartyId: dto.supplierPartyId,
              siteId: dto.siteId,
              purchaseOrderId: order?.id ?? null,
              receiptDate: dto.receiptDate,
              challanNo: dto.challanNo ?? null,
              notes: dto.notes ?? null,
            }),
          );

          for (const line of dto.lines) {
            // Quantity only — value enters with the bill (ACCOUNTING_RULES).
            // Written in this transaction, so a receipt that saved cannot leave
            // the yard pretending nothing arrived.
            const movement = await this.stock.record(manager, {
              companyId,
              userId,
              warehouseId: line.warehouseId,
              itemId: line.itemId,
              movementType: 'purchase',
              direction: 'in',
              quantity: qty(line.quantity),
              movementDate: dto.receiptDate,
              sourceType: 'goods_receipt',
              sourceId: receipt.id,
              notes: `Received from ${supplier.name}${dto.challanNo ? ` on challan ${dto.challanNo}` : ''}`,
            });

            await manager.save(
              manager.create(GoodsReceiptLine, {
                companyId,
                createdBy: userId,
                updatedBy: userId,
                goodsReceiptId: receipt.id,
                itemId: line.itemId,
                warehouseId: line.warehouseId,
                quantity: qty(line.quantity),
                stockMovementId: movement.id,
              }),
            );
          }

          if (order) await this.refreshOrderStatus(manager, companyId, order, dto.lines, userId);

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'goods_receipts',
              entityId: receipt.id,
              after: { grnNo: receipt.grnNo, supplier: supplier.name, lines: dto.lines.length },
            },
            manager,
          );

          return receipt;
        },
      ),
    );
  }

  /** Moves a PO to `partial` or `received` as its lines fill up. */
  private async refreshOrderStatus(
    manager: EntityManager,
    companyId: string,
    order: PurchaseOrder,
    received: { itemId: string; quantity: string }[],
    userId: string,
  ): Promise<void> {
    const lines = await manager.find(PurchaseOrderLine, { where: { purchaseOrderId: order.id, companyId } });

    for (const line of lines) {
      const got = received
        .filter((r) => r.itemId === line.itemId)
        .reduce((total, r) => total.plus(r.quantity), new Decimal(0));
      if (got.greaterThan(0)) {
        line.receivedQuantity = qty(new Decimal(line.receivedQuantity).plus(got));
        line.updatedBy = userId;
        await manager.save(line);
      }
    }

    const complete = lines.every((l) => new Decimal(l.receivedQuantity).greaterThanOrEqualTo(l.quantity));
    const anything = lines.some((l) => new Decimal(l.receivedQuantity).greaterThan(0));
    order.status = complete ? 'received' : anything ? 'partial' : 'open';
    order.updatedBy = userId;
    await manager.save(order);
  }

  // ── PUR-03 / GST-03 supplier bill ──────────────────────────────────────────

  async createPurchaseBill(
    companyId: string,
    userId: string,
    dto: CreatePurchaseBillDto,
    idempotencyKey: string | null = null,
  ): Promise<PurchaseBill> {
    assertNotFuture(dto.billDate, 'A supplier bill');

    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        { companyId, userId, endpoint: 'POST /purchases/bills', key: idempotencyKey, body: dto },
        async () => {
          const supplier = await this.assertSupplier(manager, companyId, dto.supplierPartyId);
          await this.assertSite(manager, companyId, dto.siteId);
          await this.assertItems(
            manager,
            companyId,
            dto.lines.map((l) => l.itemId),
          );

          if (dto.grnId) {
            const grn = await manager.findOne(GoodsReceipt, { where: { id: dto.grnId, companyId } });
            if (!grn) throw new BusinessRuleException('GRN_NOT_FOUND', 'That goods receipt does not exist');
            if (grn.supplierPartyId !== dto.supplierPartyId) {
              throw new BusinessRuleException(
                'GRN_SUPPLIER_MISMATCH',
                'That goods receipt belongs to a different supplier',
              );
            }
            // One bill per receipt: billing the same delivery twice is the
            // commonest way a supplier is overpaid.
            const already = await manager.findOne(PurchaseBill, { where: { grnId: dto.grnId, companyId } });
            if (already) {
              throw new BusinessRuleException(
                'GRN_ALREADY_BILLED',
                `That goods receipt is already billed on invoice ${already.supplierInvoiceNo}`,
              );
            }
          }

          // Every amount in Decimal, rounded to paise once at the end of each
          // line, so the bill total is the sum of what the lines actually say.
          let taxable = new Decimal(0);
          let cgst = new Decimal(0);
          let sgst = new Decimal(0);
          let igst = new Decimal(0);

          const computed = dto.lines.map((line) => {
            const lineTaxable = new Decimal(line.quantity).times(line.rate).toDecimalPlaces(2);
            const lineCgst = lineTaxable.times(line.cgstRate).dividedBy(100).toDecimalPlaces(2);
            const lineSgst = lineTaxable.times(line.sgstRate).dividedBy(100).toDecimalPlaces(2);
            const lineIgst = lineTaxable.times(line.igstRate).dividedBy(100).toDecimalPlaces(2);
            taxable = taxable.plus(lineTaxable);
            cgst = cgst.plus(lineCgst);
            sgst = sgst.plus(lineSgst);
            igst = igst.plus(lineIgst);
            return { line, lineTaxable, lineCgst, lineSgst, lineIgst };
          });

          const total = taxable.plus(cgst).plus(sgst).plus(igst);

          const purchases = await this.ledgerByCode(manager, companyId, 'PURCHASES_RAW_MATERIAL');
          const lines = [{ ledgerId: purchases.id, debit: money(taxable), credit: '0.00', siteId: dto.siteId }];
          // Input GST is a claimable credit, so each component gets its own
          // ledger rather than being folded into the purchase cost.
          for (const [code, amount] of [
            ['INPUT_CGST', cgst],
            ['INPUT_SGST', sgst],
            ['INPUT_IGST', igst],
          ] as const) {
            if (amount.greaterThan(0)) {
              const ledger = await this.ledgerByCode(manager, companyId, code);
              lines.push({ ledgerId: ledger.id, debit: money(amount), credit: '0.00', siteId: dto.siteId });
            }
          }
          lines.push({
            ledgerId: supplier.ledgerId,
            debit: '0.00',
            credit: money(total),
            siteId: dto.siteId,
            partyId: supplier.id,
          } as never);

          const posted = await this.posting.post(manager, {
            companyId,
            userId,
            voucherTypeCode: 'purchase',
            voucherDate: dto.billDate,
            siteId: dto.siteId,
            narration: `Purchase from ${supplier.name}, invoice ${dto.supplierInvoiceNo}`,
            sourceType: 'purchase_bill',
            lines,
          });

          const bill = await manager.save(
            manager.create(PurchaseBill, {
              companyId,
              createdBy: userId,
              updatedBy: userId,
              supplierPartyId: dto.supplierPartyId,
              siteId: dto.siteId,
              supplierInvoiceNo: dto.supplierInvoiceNo,
              billDate: dto.billDate,
              dueDate: dto.dueDate ?? null,
              grnId: dto.grnId ?? null,
              taxableAmount: money(taxable),
              cgstAmount: money(cgst),
              sgstAmount: money(sgst),
              igstAmount: money(igst),
              totalAmount: money(total),
              paidAmount: '0.00',
              voucherId: posted.voucher.id,
              notes: dto.notes ?? null,
            }),
          );

          for (const c of computed) {
            await manager.save(
              manager.create(PurchaseBillLine, {
                companyId,
                createdBy: userId,
                updatedBy: userId,
                purchaseBillId: bill.id,
                itemId: c.line.itemId,
                quantity: qty(c.line.quantity),
                rate: money(c.line.rate),
                taxableAmount: money(c.lineTaxable),
                cgstRate: c.line.cgstRate,
                sgstRate: c.line.sgstRate,
                igstRate: c.line.igstRate,
                cgstAmount: money(c.lineCgst),
                sgstAmount: money(c.lineSgst),
                igstAmount: money(c.lineIgst),
              }),
            );
          }

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'purchase_bills',
              entityId: bill.id,
              after: {
                supplierInvoiceNo: bill.supplierInvoiceNo,
                totalAmount: bill.totalAmount,
                voucherId: posted.voucher.id,
              },
            },
            manager,
          );

          return bill;
        },
      ),
    );
  }

  // ── PUR-04 supplier payment, bill-wise ─────────────────────────────────────

  async createSupplierPayment(
    companyId: string,
    userId: string,
    dto: CreateSupplierPaymentDto,
    idempotencyKey: string | null = null,
  ): Promise<SupplierPayment> {
    assertNotFuture(dto.paymentDate, 'A payment');

    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        { companyId, userId, endpoint: 'POST /purchases/payments', key: idempotencyKey, body: dto },
        async () => {
          const supplier = await this.assertSupplier(manager, companyId, dto.supplierPartyId);
          await this.assertSite(manager, companyId, dto.siteId);

          const paidFrom = await manager.findOne(Ledger, { where: { id: dto.paidFromLedgerId, companyId } });
          if (!paidFrom) throw new BusinessRuleException('LEDGER_NOT_FOUND', 'That cash or bank ledger does not exist');

          // Lock the supplier's bills for the life of this transaction. Two
          // payments allocated at the same moment would otherwise each read the
          // same `paid_amount` and together overpay the bill — the read-then-
          // write shape ADR-027 exists to close.
          await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
            `supplier-pay:${companyId}:${dto.supplierPartyId}`,
          ]);

          let total = new Decimal(0);
          const bills = new Map<string, PurchaseBill>();

          for (const alloc of dto.allocations) {
            if (bills.has(alloc.billId)) {
              throw new BusinessRuleException(
                'DUPLICATE_BILL_ALLOCATION',
                'Each bill may appear once in a payment — combine the amounts',
              );
            }
            const bill = await manager.findOne(PurchaseBill, { where: { id: alloc.billId, companyId } });
            if (!bill) throw new BusinessRuleException('BILL_NOT_FOUND', 'One of those bills does not exist');
            if (bill.supplierPartyId !== dto.supplierPartyId) {
              throw new BusinessRuleException(
                'BILL_SUPPLIER_MISMATCH',
                'One of those bills belongs to a different supplier',
              );
            }

            const outstanding = new Decimal(bill.totalAmount).minus(bill.paidAmount);
            if (new Decimal(alloc.amount).greaterThan(outstanding)) {
              throw new BusinessRuleException(
                'ALLOCATION_EXCEEDS_OUTSTANDING',
                `Invoice ${bill.supplierInvoiceNo} has only ${money(outstanding)} outstanding, and this allocates ${money(alloc.amount)}`,
              );
            }

            bills.set(alloc.billId, bill);
            total = total.plus(alloc.amount);
          }

          const posted = await this.posting.post(manager, {
            companyId,
            userId,
            voucherTypeCode: 'payment',
            voucherDate: dto.paymentDate,
            siteId: dto.siteId,
            narration: `Paid ${supplier.name} by ${dto.mode}${dto.reference ? ` (${dto.reference})` : ''}`,
            sourceType: 'supplier_payment',
            lines: [
              {
                ledgerId: supplier.ledgerId,
                debit: money(total),
                credit: '0.00',
                siteId: dto.siteId,
                partyId: supplier.id,
              },
              { ledgerId: paidFrom.id, debit: '0.00', credit: money(total), siteId: dto.siteId },
            ],
          });

          const payment = await manager.save(
            manager.create(SupplierPayment, {
              companyId,
              createdBy: userId,
              updatedBy: userId,
              supplierPartyId: dto.supplierPartyId,
              siteId: dto.siteId,
              paymentDate: dto.paymentDate,
              mode: dto.mode,
              paidFromLedgerId: paidFrom.id,
              amount: money(total),
              reference: dto.reference ?? null,
              voucherId: posted.voucher.id,
              notes: dto.notes ?? null,
            }),
          );

          for (const alloc of dto.allocations) {
            const bill = bills.get(alloc.billId)!;
            bill.paidAmount = money(new Decimal(bill.paidAmount).plus(alloc.amount));
            bill.updatedBy = userId;
            await manager.save(bill);

            await manager.save(
              manager.create(SupplierPaymentAllocation, {
                companyId,
                createdBy: userId,
                updatedBy: userId,
                supplierPaymentId: payment.id,
                purchaseBillId: alloc.billId,
                amount: money(alloc.amount),
              }),
            );
          }

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'supplier_payments',
              entityId: payment.id,
              after: { amount: payment.amount, bills: dto.allocations.length, voucherId: posted.voucher.id },
            },
            manager,
          );

          return payment;
        },
      ),
    );
  }

  // ── PUR-05 purchase return / debit note ────────────────────────────────────

  async createPurchaseReturn(
    companyId: string,
    userId: string,
    dto: CreatePurchaseReturnDto,
    idempotencyKey: string | null = null,
  ): Promise<PurchaseReturn> {
    assertNotFuture(dto.returnDate, 'A purchase return');

    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        { companyId, userId, endpoint: 'POST /purchases/returns', key: idempotencyKey, body: dto },
        async () => {
          const supplier = await this.assertSupplier(manager, companyId, dto.supplierPartyId);
          await this.assertSite(manager, companyId, dto.siteId);
          await this.assertItems(
            manager,
            companyId,
            dto.lines.map((l) => l.itemId),
          );

          if (dto.billId) {
            const bill = await manager.findOne(PurchaseBill, { where: { id: dto.billId, companyId } });
            if (!bill) throw new BusinessRuleException('BILL_NOT_FOUND', 'That bill does not exist');
            if (bill.supplierPartyId !== dto.supplierPartyId) {
              throw new BusinessRuleException('BILL_SUPPLIER_MISMATCH', 'That bill belongs to a different supplier');
            }
          }

          let taxable = new Decimal(0);
          let tax = new Decimal(0);
          const computed = dto.lines.map((line) => {
            const lineTaxable = new Decimal(line.quantity).times(line.rate).toDecimalPlaces(2);
            const rate = new Decimal(line.cgstRate).plus(line.sgstRate).plus(line.igstRate);
            const lineTax = lineTaxable.times(rate).dividedBy(100).toDecimalPlaces(2);
            taxable = taxable.plus(lineTaxable);
            tax = tax.plus(lineTax);
            return { line, lineTaxable, lineTax };
          });
          const total = taxable.plus(tax);

          // The mirror of a bill: the supplier is debited, purchases and the
          // input GST credited back.
          const purchases = await this.ledgerByCode(manager, companyId, 'PURCHASES_RAW_MATERIAL');
          const lines: Record<string, unknown>[] = [
            {
              ledgerId: supplier.ledgerId,
              debit: money(total),
              credit: '0.00',
              siteId: dto.siteId,
              partyId: supplier.id,
            },
            { ledgerId: purchases.id, debit: '0.00', credit: money(taxable), siteId: dto.siteId },
          ];
          if (tax.greaterThan(0)) {
            // Credited back to the same component the bill debited: a return of
            // intra-state goods reverses CGST + SGST, inter-state reverses IGST.
            const anyIgst = dto.lines.some((l) => Number(l.igstRate) > 0);
            if (anyIgst) {
              const igstLedger = await this.ledgerByCode(manager, companyId, 'INPUT_IGST');
              lines.push({ ledgerId: igstLedger.id, debit: '0.00', credit: money(tax), siteId: dto.siteId });
            } else {
              const half = tax.dividedBy(2).toDecimalPlaces(2);
              const cgstLedger = await this.ledgerByCode(manager, companyId, 'INPUT_CGST');
              const sgstLedger = await this.ledgerByCode(manager, companyId, 'INPUT_SGST');
              lines.push({ ledgerId: cgstLedger.id, debit: '0.00', credit: money(half), siteId: dto.siteId });
              // The remainder, so a half-paisa rounding cannot unbalance the voucher.
              lines.push({
                ledgerId: sgstLedger.id,
                debit: '0.00',
                credit: money(tax.minus(half)),
                siteId: dto.siteId,
              });
            }
          }

          const posted = await this.posting.post(manager, {
            companyId,
            userId,
            voucherTypeCode: 'debit_note',
            voucherDate: dto.returnDate,
            siteId: dto.siteId,
            narration: `Returned to ${supplier.name}: ${dto.reason}`,
            sourceType: 'purchase_return',
            lines: lines as never,
          });

          // Created after the voucher, not before: `voucher_id` is a NOT NULL
          // foreign key, so a placeholder id would be refused outright.
          const returnDoc = await manager.save(
            manager.create(PurchaseReturn, {
              companyId,
              createdBy: userId,
              updatedBy: userId,
              supplierPartyId: dto.supplierPartyId,
              siteId: dto.siteId,
              billId: dto.billId ?? null,
              returnDate: dto.returnDate,
              reason: dto.reason,
              taxableAmount: money(taxable),
              taxAmount: money(tax),
              totalAmount: money(total),
              voucherId: posted.voucher.id,
            }),
          );

          for (const c of computed) {
            // Goods physically leave. `StockService` refuses to take out more
            // than is there (ADR-026), so a return of stock already consumed
            // rolls the whole document back rather than driving the yard negative.
            const movement = await this.stock.record(manager, {
              companyId,
              userId,
              warehouseId: c.line.warehouseId,
              itemId: c.line.itemId,
              movementType: 'purchase',
              direction: 'out',
              quantity: qty(c.line.quantity),
              movementDate: dto.returnDate,
              sourceType: 'purchase_return',
              sourceId: returnDoc.id,
              notes: `Returned to ${supplier.name}: ${dto.reason}`,
            });

            await manager.save(
              manager.create(PurchaseReturnLine, {
                companyId,
                createdBy: userId,
                updatedBy: userId,
                purchaseReturnId: returnDoc.id,
                itemId: c.line.itemId,
                warehouseId: c.line.warehouseId,
                quantity: qty(c.line.quantity),
                rate: money(c.line.rate),
                taxableAmount: money(c.lineTaxable),
                taxAmount: money(c.lineTax),
                stockMovementId: movement.id,
              }),
            );
          }

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'purchase_returns',
              entityId: returnDoc.id,
              after: { totalAmount: returnDoc.totalAmount, reason: dto.reason, voucherId: posted.voucher.id },
            },
            manager,
          );

          return returnDoc;
        },
      ),
    );
  }

  // ── reads ──────────────────────────────────────────────────────────────────

  async listPurchaseOrders(companyId: string, query: PurchaseOrderQueryDto) {
    const qb = this.em.createQueryBuilder(PurchaseOrder, 'o').where('o.company_id = :companyId', { companyId });
    if (query.supplierPartyId) qb.andWhere('o.supplier_party_id = :s', { s: query.supplierPartyId });
    if (query.siteId) qb.andWhere('o.site_id = :site', { site: query.siteId });
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

  async getPurchaseOrder(companyId: string, id: string) {
    const order = await this.em.findOne(PurchaseOrder, { where: { id, companyId } });
    if (!order) throw new NotFoundException('That purchase order does not exist');
    const lines = await this.em.find(PurchaseOrderLine, { where: { purchaseOrderId: id, companyId } });
    return { order, lines };
  }

  async listGoodsReceipts(companyId: string, query: GrnQueryDto) {
    const qb = this.em.createQueryBuilder(GoodsReceipt, 'g').where('g.company_id = :companyId', { companyId });
    if (query.supplierPartyId) qb.andWhere('g.supplier_party_id = :s', { s: query.supplierPartyId });
    if (query.siteId) qb.andWhere('g.site_id = :site', { site: query.siteId });
    if (query.purchaseOrderId) qb.andWhere('g.purchase_order_id = :po', { po: query.purchaseOrderId });
    if (query.from) qb.andWhere('g.receipt_date >= :from', { from: query.from });
    if (query.to) qb.andWhere('g.receipt_date <= :to', { to: query.to });

    const total = await qb.getCount();
    const items = await qb
      .orderBy('g.receipt_date', 'DESC')
      .addOrderBy('g.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();
    return { items, meta: { page: query.page, limit: query.limit, total } };
  }

  async getGoodsReceipt(companyId: string, id: string) {
    const receipt = await this.em.findOne(GoodsReceipt, { where: { id, companyId } });
    if (!receipt) throw new NotFoundException('That goods receipt does not exist');
    const lines = await this.em.find(GoodsReceiptLine, { where: { goodsReceiptId: id, companyId } });
    return { receipt, lines };
  }

  async listPurchaseBills(companyId: string, query: PurchaseBillQueryDto) {
    const qb = this.em.createQueryBuilder(PurchaseBill, 'b').where('b.company_id = :companyId', { companyId });
    if (query.supplierPartyId) qb.andWhere('b.supplier_party_id = :s', { s: query.supplierPartyId });
    if (query.siteId) qb.andWhere('b.site_id = :site', { site: query.siteId });
    if (query.unpaidOnly) qb.andWhere('b.paid_amount < b.total_amount');
    if (query.from) qb.andWhere('b.bill_date >= :from', { from: query.from });
    if (query.to) qb.andWhere('b.bill_date <= :to', { to: query.to });

    const total = await qb.getCount();
    const items = await qb
      .orderBy('b.bill_date', 'DESC')
      .addOrderBy('b.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();
    return { items, meta: { page: query.page, limit: query.limit, total } };
  }

  async getPurchaseBill(companyId: string, id: string) {
    const bill = await this.em.findOne(PurchaseBill, { where: { id, companyId } });
    if (!bill) throw new NotFoundException('That bill does not exist');
    const lines = await this.em.find(PurchaseBillLine, { where: { purchaseBillId: id, companyId } });
    const allocations = await this.em.find(SupplierPaymentAllocation, {
      where: { purchaseBillId: id, companyId },
    });
    return { bill, lines, allocations };
  }

  /**
   * PUR-06 — payables ageing.
   *
   * Buckets each unpaid bill by how long it has been due, counting from the due
   * date where one was given and the bill date otherwise — a supplier who never
   * stated terms is still owed from the day they invoiced.
   */
  async payablesAgeing(companyId: string, query: PayablesAgeingQueryDto) {
    const asOf = query.asOf ?? todayCalendarDate();

    const qb = this.em
      .createQueryBuilder(PurchaseBill, 'b')
      .innerJoin(Party, 'p', 'p.id = b.supplier_party_id')
      .where('b.company_id = :companyId', { companyId })
      .andWhere('b.deleted_at IS NULL')
      .andWhere('b.paid_amount < b.total_amount')
      .andWhere('b.bill_date <= :asOf', { asOf });
    if (query.supplierPartyId) qb.andWhere('b.supplier_party_id = :s', { s: query.supplierPartyId });
    if (query.siteId) qb.andWhere('b.site_id = :site', { site: query.siteId });

    const rows = await qb
      .select('b.supplier_party_id', 'supplierPartyId')
      .addSelect('p.name', 'supplierName')
      .addSelect('b.id', 'billId')
      .addSelect('b.supplier_invoice_no', 'supplierInvoiceNo')
      .addSelect('b.bill_date', 'billDate')
      .addSelect('b.due_date', 'dueDate')
      .addSelect('b.total_amount', 'totalAmount')
      .addSelect('b.paid_amount', 'paidAmount')
      .addSelect('(:asOf::date - COALESCE(b.due_date, b.bill_date))', 'daysOverdue')
      .setParameter('asOf', asOf)
      .orderBy('p.name', 'ASC')
      .addOrderBy('b.bill_date', 'ASC')
      .getRawMany<{
        supplierPartyId: string;
        supplierName: string;
        billId: string;
        supplierInvoiceNo: string;
        billDate: string | Date;
        dueDate: string | Date | null;
        totalAmount: string;
        paidAmount: string;
        daysOverdue: string;
      }>();

    const BUCKETS = ['current', 'd1_30', 'd31_60', 'd61_90', 'd90_plus'] as const;
    const bucketOf = (days: number): (typeof BUCKETS)[number] =>
      days <= 0 ? 'current' : days <= 30 ? 'd1_30' : days <= 60 ? 'd31_60' : days <= 90 ? 'd61_90' : 'd90_plus';

    const bySupplier = new Map<
      string,
      {
        supplierPartyId: string;
        supplierName: string;
        outstanding: Decimal;
        buckets: Record<(typeof BUCKETS)[number], Decimal>;
        bills: {
          billId: string;
          supplierInvoiceNo: string;
          billDate: string;
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

      let entry = bySupplier.get(r.supplierPartyId);
      if (!entry) {
        entry = {
          supplierPartyId: r.supplierPartyId,
          supplierName: r.supplierName,
          outstanding: new Decimal(0),
          buckets: Object.fromEntries(BUCKETS.map((b) => [b, new Decimal(0)])) as never,
          bills: [],
        };
        bySupplier.set(r.supplierPartyId, entry);
      }
      entry.outstanding = entry.outstanding.plus(outstanding);
      entry.buckets[bucket] = entry.buckets[bucket].plus(outstanding);
      totals[bucket] = totals[bucket]!.plus(outstanding);
      entry.bills.push({
        billId: r.billId,
        supplierInvoiceNo: r.supplierInvoiceNo,
        billDate: toCalendarDate(r.billDate),
        dueDate: r.dueDate ? toCalendarDate(r.dueDate) : null,
        outstanding: money(outstanding),
        daysOverdue: days,
        bucket,
      });
    }

    const suppliers = [...bySupplier.values()].map((e) => ({
      supplierPartyId: e.supplierPartyId,
      supplierName: e.supplierName,
      outstanding: money(e.outstanding),
      buckets: Object.fromEntries(BUCKETS.map((b) => [b, money(e.buckets[b])])),
      bills: e.bills,
    }));

    return {
      asOf,
      suppliers,
      totals: {
        ...Object.fromEntries(BUCKETS.map((b) => [b, money(totals[b]!)])),
        outstanding: money(BUCKETS.reduce((acc, b) => acc.plus(totals[b]!), new Decimal(0))),
      },
    };
  }
}
