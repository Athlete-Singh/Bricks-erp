import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { EntityManager } from 'typeorm';
import {
  COST_PER_THOUSAND_BENCHMARK,
  type CostPerThousandQueryDto,
  type DashboardMonthlyQueryDto,
  type DashboardSummaryQueryDto,
} from '@brics/shared';
import { BusinessRuleException } from '../../common/exceptions/business-rule.exception';
import { todayCalendarDate } from '../../common/time/calendar-date';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

const money = (v: Decimal.Value): string => new Decimal(v).toFixed(2);
const bricks = (v: Decimal.Value): string => new Decimal(v).toFixed(3);

/**
 * Keep the dashboard honest when there's nothing to divide by: a zero-fired
 * month returns `null` cost per 1,000 and gross margin rather than ∞ or NaN.
 * Same shape as ADR-029 — unknown is a different claim from "it was free".
 */
const safeDivide = (num: Decimal, denom: Decimal): string | null =>
  denom.isZero() ? null : num.dividedBy(denom).toFixed(2);

interface MonthWindow {
  firstOfMonth: string;
  lastOfMonth: string;
  firstOfYear: string;
}

function monthWindow(asOf: string): MonthWindow {
  const d = new Date(`${asOf}T00:00:00Z`);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const firstOfMonth = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const nextMonth = new Date(Date.UTC(y, m + 1, 0));
  const lastOfMonth = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}-${String(
    nextMonth.getUTCDate(),
  ).padStart(2, '0')}`;
  // Indian FY: April through March. Any date in Jan-Mar belongs to the previous April's year.
  const fyStartYear = m >= 3 ? y : y - 1;
  const firstOfYear = `${fyStartYear}-04-01`;
  return { firstOfMonth, lastOfMonth, firstOfYear };
}

function siteFilter(params: unknown[], siteId: string | undefined, alias = 'site_id'): string {
  if (!siteId) return '';
  params.push(siteId);
  return ` AND "${alias}" = $${params.length}`;
}

@Injectable()
export class DashboardService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  // ── DSH-01 — the Key Management Questions in one call ─────────────────────

  async summary(companyId: string, query: DashboardSummaryQueryDto) {
    const asOf = query.asOf ?? todayCalendarDate();
    const win = monthWindow(asOf);

    const [production, stock, sold, dispatched, partyBalances, expenses, coalDiesel, incomeExpense] = await Promise.all(
      [
        this.productionCounts(companyId, asOf, win, query.siteId),
        this.stockOnHand(companyId, asOf, query.siteId),
        this.salesInvoiced(companyId, win, query.siteId),
        this.dispatchedBricks(companyId, win, query.siteId),
        this.partyBalances(companyId, asOf),
        this.expenseTotals(companyId, win, query.siteId),
        this.coalDieselCost(companyId, win, query.siteId),
        this.incomeExpenseForWindow(companyId, win, query.siteId),
      ],
    );

    const firedMtd = new Decimal(production.firedMtd);
    const directExpenseMtd = new Decimal(incomeExpense.directExpense);
    const directIncomeMtd = new Decimal(incomeExpense.directIncome);
    const costPerThousandMtd = safeDivide(directExpenseMtd.times(1000), firedMtd);
    const grossProfit = directIncomeMtd.minus(directExpenseMtd);
    const grossMargin = safeDivide(grossProfit.times(100), directIncomeMtd);

    return {
      items: [],
      meta: {
        asOf,
        window: win,
        siteId: query.siteId ?? null,
        production,
        stock,
        sold,
        dispatched,
        receivables: partyBalances.receivables,
        payables: partyBalances.payables,
        labourPayable: partyBalances.labourPayable,
        expenses,
        coalCostMtd: coalDiesel.coalMtd,
        dieselCostMtd: coalDiesel.dieselMtd,
        /**
         * MTD profit, read straight off the ledgers. The P&L endpoint has the
         * authoritative figure with opening/closing stock folded in; this one
         * is the quick read the owner sees without opening the statement.
         */
        estimatedProfitMtd: money(new Decimal(incomeExpense.income).minus(incomeExpense.expense)),
        costPerThousandMtd,
        costPerThousandBenchmark: COST_PER_THOUSAND_BENCHMARK,
        grossMarginPercentMtd: grossMargin,
      },
    };
  }

  private async productionCounts(
    companyId: string,
    asOf: string,
    win: MonthWindow,
    siteId?: string,
  ): Promise<{
    firedToday: string;
    firedMtd: string;
    firedYtd: string;
    sortedToday: string;
    sortedMtd: string;
    sortedYtd: string;
  }> {
    const params: unknown[] = [companyId, asOf, win.firstOfMonth, win.lastOfMonth, win.firstOfYear];
    const sf = siteFilter(params, siteId, 'site_id');
    const rows = await this.em.query<{ fired_today: string; fired_mtd: string; fired_ytd: string }[]>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN pe."entry_date" = $2 THEN pe."fired_bricks" END), 0)::text AS fired_today,
        COALESCE(SUM(CASE WHEN pe."entry_date" BETWEEN $3 AND $4 THEN pe."fired_bricks" END), 0)::text AS fired_mtd,
        COALESCE(SUM(CASE WHEN pe."entry_date" BETWEEN $5 AND $4 THEN pe."fired_bricks" END), 0)::text AS fired_ytd
      FROM "production_entries" pe
      JOIN "production_batches" pb ON pb."id" = pe."batch_id" AND pb."deleted_at" IS NULL
      WHERE pb."company_id" = $1 AND pe."stage" = 'firing' AND pe."deleted_at" IS NULL${sf.replace(
        'site_id',
        'pb."site_id"',
      )}
      `,
      params,
    );

    // Sorted good output comes from production_sorting_outputs; the sort entry
    // date is on production_entries, and sorted bricks are a different number
    // from fired because broken/reject are deducted at sort.
    const sortedRows = await this.em.query<{ sorted_today: string; sorted_mtd: string; sorted_ytd: string }[]>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN pe."entry_date" = $2 THEN pso."quantity" END), 0)::text AS sorted_today,
        COALESCE(SUM(CASE WHEN pe."entry_date" BETWEEN $3 AND $4 THEN pso."quantity" END), 0)::text AS sorted_mtd,
        COALESCE(SUM(CASE WHEN pe."entry_date" BETWEEN $5 AND $4 THEN pso."quantity" END), 0)::text AS sorted_ytd
      FROM "production_sorting_outputs" pso
      JOIN "production_entries" pe ON pe."id" = pso."entry_id" AND pe."deleted_at" IS NULL
      JOIN "production_batches" pb ON pb."id" = pe."batch_id" AND pb."deleted_at" IS NULL
      WHERE pb."company_id" = $1 AND pso."deleted_at" IS NULL${sf.replace('site_id', 'pb."site_id"')}
      `,
      params,
    );

    const row = rows[0]!;
    const sortedRow = sortedRows[0]!;
    return {
      firedToday: bricks(row.fired_today),
      firedMtd: bricks(row.fired_mtd),
      firedYtd: bricks(row.fired_ytd),
      sortedToday: bricks(sortedRow.sorted_today),
      sortedMtd: bricks(sortedRow.sorted_mtd),
      sortedYtd: bricks(sortedRow.sorted_ytd),
    };
  }

  /**
   * Finished bricks on hand come from the brick_type side of the ledger —
   * production writes a stock IN per grade on sort (ADR-023), so a sum of
   * brick-type balances is the yard count. The item side is reported alongside
   * for bulk goods (coal, diesel) that live under `item_id`, and the two are
   * kept separate because they're different units — kilograms of coal cannot
   * be added to pieces of brick.
   */
  private async stockOnHand(
    companyId: string,
    asOf: string,
    siteId?: string,
  ): Promise<{ bricksProduced: string; itemsOnHand: string; itemCount: number }> {
    const params: unknown[] = [companyId, asOf];
    let sf = '';
    if (siteId) {
      params.push(siteId);
      sf = ` AND w."site_id" = $${params.length}`;
    }

    const rows = await this.em.query<{ bricks_qty: string; items_qty: string; item_count: string }[]>(
      `
      WITH balances AS (
        SELECT
          COALESCE(m."brick_type_id", m."item_id") AS subject_id,
          m."brick_type_id" IS NOT NULL AS is_brick,
          SUM(m."quantity_in") - SUM(m."quantity_out") AS balance
        FROM "stock_movements" m
        JOIN "warehouses" w ON w."id" = m."warehouse_id"
        WHERE m."company_id" = $1 AND m."movement_date" <= $2 AND m."deleted_at" IS NULL${sf}
        GROUP BY COALESCE(m."brick_type_id", m."item_id"), (m."brick_type_id" IS NOT NULL)
      )
      SELECT
        COALESCE(SUM(CASE WHEN is_brick AND balance > 0 THEN balance END), 0)::text AS bricks_qty,
        COALESCE(SUM(CASE WHEN NOT is_brick AND balance > 0 THEN balance END), 0)::text AS items_qty,
        COUNT(*) FILTER (WHERE balance <> 0)::text AS item_count
      FROM balances
      `,
      params,
    );

    const row = rows[0]!;
    return {
      bricksProduced: bricks(row.bricks_qty),
      itemsOnHand: bricks(row.items_qty),
      itemCount: Number(row.item_count),
    };
  }

  private async salesInvoiced(
    companyId: string,
    win: MonthWindow,
    siteId?: string,
  ): Promise<{ mtd: string; ytd: string; collectionMtd: string; collectionYtd: string }> {
    const params: unknown[] = [companyId, win.firstOfMonth, win.lastOfMonth, win.firstOfYear];
    const sf = siteFilter(params, siteId, 'site_id');

    const invoiced = await this.em.query<{ mtd: string; ytd: string }[]>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN "invoice_date" BETWEEN $2 AND $3 THEN "total_amount" END), 0)::text AS mtd,
        COALESCE(SUM(CASE WHEN "invoice_date" BETWEEN $4 AND $3 THEN "total_amount" END), 0)::text AS ytd
      FROM "sales_invoices"
      WHERE "company_id" = $1 AND "status" <> 'cancelled' AND "deleted_at" IS NULL${sf}
      `,
      params,
    );

    const collected = await this.em.query<{ mtd: string; ytd: string }[]>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN "receipt_date" BETWEEN $2 AND $3 THEN "amount" END), 0)::text AS mtd,
        COALESCE(SUM(CASE WHEN "receipt_date" BETWEEN $4 AND $3 THEN "amount" END), 0)::text AS ytd
      FROM "customer_receipts"
      WHERE "company_id" = $1 AND "deleted_at" IS NULL${sf}
      `,
      params,
    );

    return {
      mtd: money(invoiced[0]!.mtd),
      ytd: money(invoiced[0]!.ytd),
      collectionMtd: money(collected[0]!.mtd),
      collectionYtd: money(collected[0]!.ytd),
    };
  }

  private async dispatchedBricks(
    companyId: string,
    win: MonthWindow,
    siteId?: string,
  ): Promise<{ mtd: string; ytd: string }> {
    const params: unknown[] = [companyId, win.firstOfMonth, win.lastOfMonth, win.firstOfYear];
    const sf = siteFilter(params, siteId, 'site_id');

    const rows = await this.em.query<{ mtd: string; ytd: string }[]>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN d."dispatch_date" BETWEEN $2 AND $3 THEN dl."quantity" END), 0)::text AS mtd,
        COALESCE(SUM(CASE WHEN d."dispatch_date" BETWEEN $4 AND $3 THEN dl."quantity" END), 0)::text AS ytd
      FROM "dispatches" d
      JOIN "dispatch_lines" dl ON dl."dispatch_id" = d."id" AND dl."deleted_at" IS NULL
      WHERE d."company_id" = $1 AND d."status" IN ('confirmed', 'delivered') AND d."deleted_at" IS NULL${sf.replace(
        'site_id',
        'd."site_id"',
      )}
      `,
      params,
    );

    return { mtd: bricks(rows[0]!.mtd), ytd: bricks(rows[0]!.ytd) };
  }

  /**
   * Receivables sit on the debit side of a customer party ledger; payables sit
   * on the credit side of a supplier's. Labour payable is the same shape over
   * Sardar parties — a sardar with wages accrued and not yet paid stands as a
   * credit balance on their own ledger.
   */
  private async partyBalances(
    companyId: string,
    asOf: string,
  ): Promise<{ receivables: string; payables: string; labourPayable: string }> {
    const rows = await this.em.query<{ party_types: string[]; debit: string; credit: string }[]>(
      `
      SELECT
        p."party_types",
        COALESCE(SUM(CASE WHEN v."id" IS NOT NULL THEN vl."debit" ELSE 0 END), 0)::text AS debit,
        COALESCE(SUM(CASE WHEN v."id" IS NOT NULL THEN vl."credit" ELSE 0 END), 0)::text AS credit
      FROM "parties" p
      LEFT JOIN "ledgers" l ON l."party_id" = p."id" AND l."deleted_at" IS NULL
      LEFT JOIN "voucher_lines" vl ON vl."ledger_id" = l."id" AND vl."deleted_at" IS NULL
      LEFT JOIN "vouchers" v ON v."id" = vl."voucher_id" AND v."deleted_at" IS NULL AND v."voucher_date" <= $2
      WHERE p."company_id" = $1 AND p."deleted_at" IS NULL
      GROUP BY p."id", p."party_types"
      `,
      [companyId, asOf],
    );

    let receivables = new Decimal(0);
    let payables = new Decimal(0);
    let labourPayable = new Decimal(0);
    for (const row of rows) {
      const net = new Decimal(row.debit).minus(row.credit);
      const types = row.party_types ?? [];
      if (types.includes('customer') && net.greaterThan(0)) receivables = receivables.plus(net);
      if (types.includes('supplier') && net.lessThan(0)) payables = payables.plus(net.negated());
      if (types.includes('sardar') && net.lessThan(0)) labourPayable = labourPayable.plus(net.negated());
    }

    return {
      receivables: money(receivables),
      payables: money(payables),
      labourPayable: money(labourPayable),
    };
  }

  private async expenseTotals(
    companyId: string,
    win: MonthWindow,
    siteId?: string,
  ): Promise<{ mtd: string; ytd: string }> {
    const params: unknown[] = [companyId, win.firstOfMonth, win.lastOfMonth, win.firstOfYear];
    const sf = siteFilter(params, siteId, 'site_id');
    const rows = await this.em.query<{ mtd: string; ytd: string }[]>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN "expense_date" BETWEEN $2 AND $3 THEN "amount" END), 0)::text AS mtd,
        COALESCE(SUM(CASE WHEN "expense_date" BETWEEN $4 AND $3 THEN "amount" END), 0)::text AS ytd
      FROM "expenses"
      WHERE "company_id" = $1 AND "deleted_at" IS NULL${sf}
      `,
      params,
    );
    return { mtd: money(rows[0]!.mtd), ytd: money(rows[0]!.ytd) };
  }

  /**
   * Coal and diesel used read as DR on their expense ledgers (COAL,
   * VEHICLE_DIESEL). Reading the ledgers rather than guessing items by name
   * means a kiln's own coal and a vehicle's own diesel are both counted, and
   * either kind of booking (purchase bill or expense) lands here (ADR-043).
   */
  private async coalDieselCost(
    companyId: string,
    win: MonthWindow,
    siteId?: string,
  ): Promise<{ coalMtd: string; dieselMtd: string }> {
    const params: unknown[] = [companyId, win.firstOfMonth, win.lastOfMonth];
    let sf = '';
    if (siteId) {
      params.push(siteId);
      sf = ` AND v."site_id" = $${params.length}`;
    }
    const rows = await this.em.query<{ code: string; amount: string }[]>(
      `
      SELECT l."code", COALESCE(SUM(vl."debit") - SUM(vl."credit"), 0)::text AS amount
      FROM "ledgers" l
      JOIN "voucher_lines" vl ON vl."ledger_id" = l."id" AND vl."deleted_at" IS NULL
      JOIN "vouchers" v ON v."id" = vl."voucher_id" AND v."deleted_at" IS NULL
        AND v."voucher_date" BETWEEN $2 AND $3${sf}
      WHERE l."company_id" = $1 AND l."code" IN ('COAL', 'VEHICLE_DIESEL') AND l."deleted_at" IS NULL
      GROUP BY l."code"
      `,
      params,
    );
    const coal = rows.find((r) => r.code === 'COAL');
    const diesel = rows.find((r) => r.code === 'VEHICLE_DIESEL');
    return { coalMtd: money(coal?.amount ?? 0), dieselMtd: money(diesel?.amount ?? 0) };
  }

  private async incomeExpenseForWindow(
    companyId: string,
    win: MonthWindow,
    siteId?: string,
  ): Promise<{ income: string; expense: string; directIncome: string; directExpense: string }> {
    const params: unknown[] = [companyId, win.firstOfMonth, win.lastOfMonth];
    let sf = '';
    if (siteId) {
      params.push(siteId);
      sf = ` AND v."site_id" = $${params.length}`;
    }
    const rows = await this.em.query<{ nature: string; is_direct: boolean; debit: string; credit: string }[]>(
      `
      SELECT g."nature", g."is_direct",
        COALESCE(SUM(vl."debit"), 0)::text AS debit,
        COALESCE(SUM(vl."credit"), 0)::text AS credit
      FROM "ledgers" l
      JOIN "ledger_groups" g ON g."id" = l."group_id"
      JOIN "voucher_lines" vl ON vl."ledger_id" = l."id" AND vl."deleted_at" IS NULL
      JOIN "vouchers" v ON v."id" = vl."voucher_id" AND v."deleted_at" IS NULL
        AND v."voucher_date" BETWEEN $2 AND $3${sf}
      WHERE l."company_id" = $1 AND g."nature" IN ('income', 'expense') AND l."deleted_at" IS NULL
      GROUP BY g."nature", g."is_direct"
      `,
      params,
    );

    let income = new Decimal(0);
    let expense = new Decimal(0);
    let directIncome = new Decimal(0);
    let directExpense = new Decimal(0);
    for (const r of rows) {
      const net = new Decimal(r.credit).minus(r.debit); // income natural: credit
      const amount = r.nature === 'income' ? net : net.negated();
      if (r.nature === 'income') {
        income = income.plus(amount);
        if (r.is_direct) directIncome = directIncome.plus(amount);
      } else {
        expense = expense.plus(amount);
        if (r.is_direct) directExpense = directExpense.plus(amount);
      }
    }
    return {
      income: money(income),
      expense: money(expense),
      directIncome: money(directIncome),
      directExpense: money(directExpense),
    };
  }

  // ── DSH-02 — monthly series for the trend charts ──────────────────────────

  async monthly(companyId: string, query: DashboardMonthlyQueryDto) {
    const today = todayCalendarDate();
    const toYm = query.toMonth ?? today.slice(0, 7);
    const fromYm = query.fromMonth ?? subtractMonths(toYm, 11);
    if (fromYm > toYm) {
      throw new BusinessRuleException('DATE_RANGE_INVALID', 'The end of the window is before its start');
    }
    const months = monthRange(fromYm, toYm);
    const firstDate = `${months[0]}-01`;
    const lastMonthEnd = endOfMonth(months[months.length - 1]!);

    const params: unknown[] = [companyId, firstDate, lastMonthEnd];
    let salesSite = '';
    let dispSite = '';
    let expSite = '';
    let vouSite = '';
    let prodSite = '';
    if (query.siteId) {
      params.push(query.siteId);
      const idx = `$${params.length}`;
      salesSite = ` AND "site_id" = ${idx}`;
      dispSite = ` AND d."site_id" = ${idx}`;
      expSite = ` AND "site_id" = ${idx}`;
      vouSite = ` AND v."site_id" = ${idx}`;
      prodSite = ` AND pb."site_id" = ${idx}`;
    }

    const [prodRows, saleRows, receiptRows, dispatchRows, expenseRows, voucherRows] = await Promise.all([
      this.em.query<{ ym: string; fired: string }[]>(
        `
        SELECT to_char(pe."entry_date", 'YYYY-MM') AS ym, SUM(pe."fired_bricks")::text AS fired
        FROM "production_entries" pe
        JOIN "production_batches" pb ON pb."id" = pe."batch_id" AND pb."deleted_at" IS NULL
        WHERE pb."company_id" = $1 AND pe."stage" = 'firing' AND pe."deleted_at" IS NULL
          AND pe."entry_date" BETWEEN $2 AND $3${prodSite}
        GROUP BY to_char(pe."entry_date", 'YYYY-MM')
        `,
        params,
      ),
      this.em.query<{ ym: string; sales: string }[]>(
        `
        SELECT to_char("invoice_date", 'YYYY-MM') AS ym, SUM("total_amount")::text AS sales
        FROM "sales_invoices"
        WHERE "company_id" = $1 AND "status" <> 'cancelled' AND "deleted_at" IS NULL
          AND "invoice_date" BETWEEN $2 AND $3${salesSite}
        GROUP BY to_char("invoice_date", 'YYYY-MM')
        `,
        params,
      ),
      this.em.query<{ ym: string; collection: string }[]>(
        `
        SELECT to_char("receipt_date", 'YYYY-MM') AS ym, SUM("amount")::text AS collection
        FROM "customer_receipts"
        WHERE "company_id" = $1 AND "deleted_at" IS NULL
          AND "receipt_date" BETWEEN $2 AND $3${salesSite}
        GROUP BY to_char("receipt_date", 'YYYY-MM')
        `,
        params,
      ),
      this.em.query<{ ym: string; dispatched: string }[]>(
        `
        SELECT to_char(d."dispatch_date", 'YYYY-MM') AS ym, SUM(dl."quantity")::text AS dispatched
        FROM "dispatches" d
        JOIN "dispatch_lines" dl ON dl."dispatch_id" = d."id" AND dl."deleted_at" IS NULL
        WHERE d."company_id" = $1 AND d."status" IN ('confirmed', 'delivered') AND d."deleted_at" IS NULL
          AND d."dispatch_date" BETWEEN $2 AND $3${dispSite}
        GROUP BY to_char(d."dispatch_date", 'YYYY-MM')
        `,
        params,
      ),
      this.em.query<{ ym: string; expenses: string }[]>(
        `
        SELECT to_char("expense_date", 'YYYY-MM') AS ym, SUM("amount")::text AS expenses
        FROM "expenses"
        WHERE "company_id" = $1 AND "deleted_at" IS NULL
          AND "expense_date" BETWEEN $2 AND $3${expSite}
        GROUP BY to_char("expense_date", 'YYYY-MM')
        `,
        params,
      ),
      this.em.query<{ ym: string; code: string; amount: string }[]>(
        `
        SELECT to_char(v."voucher_date", 'YYYY-MM') AS ym, l."code",
          (COALESCE(SUM(vl."debit"), 0) - COALESCE(SUM(vl."credit"), 0))::text AS amount
        FROM "ledgers" l
        JOIN "voucher_lines" vl ON vl."ledger_id" = l."id" AND vl."deleted_at" IS NULL
        JOIN "vouchers" v ON v."id" = vl."voucher_id" AND v."deleted_at" IS NULL
        WHERE l."company_id" = $1 AND l."code" IN ('COAL', 'VEHICLE_DIESEL') AND l."deleted_at" IS NULL
          AND v."voucher_date" BETWEEN $2 AND $3${vouSite}
        GROUP BY to_char(v."voucher_date", 'YYYY-MM'), l."code"
        `,
        params,
      ),
    ]);

    const prodBy = indexBy(prodRows, 'ym');
    const saleBy = indexBy(saleRows, 'ym');
    const receiptBy = indexBy(receiptRows, 'ym');
    const dispatchBy = indexBy(dispatchRows, 'ym');
    const expenseBy = indexBy(expenseRows, 'ym');
    const coalBy = new Map<string, string>();
    const dieselBy = new Map<string, string>();
    for (const r of voucherRows) {
      if (r.code === 'COAL') coalBy.set(r.ym, r.amount);
      if (r.code === 'VEHICLE_DIESEL') dieselBy.set(r.ym, r.amount);
    }

    const points = months.map((ym) => ({
      month: ym,
      productionFired: bricks(prodBy.get(ym)?.fired ?? 0),
      salesInvoiced: money(saleBy.get(ym)?.sales ?? 0),
      collection: money(receiptBy.get(ym)?.collection ?? 0),
      dispatched: bricks(dispatchBy.get(ym)?.dispatched ?? 0),
      expenses: money(expenseBy.get(ym)?.expenses ?? 0),
      coalCost: money(coalBy.get(ym) ?? 0),
      dieselCost: money(dieselBy.get(ym) ?? 0),
    }));

    return {
      items: points,
      meta: {
        fromMonth: months[0]!,
        toMonth: months[months.length - 1]!,
        monthCount: months.length,
        siteId: query.siteId ?? null,
      },
    };
  }

  // ── CST-01 — Cost per 1,000 by kiln × month × brick type ──────────────────

  /**
   * The seven cost buckets allocated to a brick type that month by its share of
   * the sorted good output. The direct expense ledgers are not tagged to a
   * brick type (a chamber fires every grade together), so a sorted number
   * matches cost to volume honestly rather than inventing an allocation key.
   */
  async costPerThousand(companyId: string, query: CostPerThousandQueryDto) {
    if (query.toDate < query.fromDate) {
      throw new BusinessRuleException('DATE_RANGE_INVALID', 'The end of the window is before its start');
    }
    const params: unknown[] = [companyId, query.fromDate, query.toDate];
    let siteClause = '';
    let brickClause = '';
    if (query.siteId) {
      params.push(query.siteId);
      siteClause = ` AND pb."site_id" = $${params.length}`;
    }
    if (query.brickTypeId) {
      params.push(query.brickTypeId);
      brickClause = ` AND pso."brick_type_id" = $${params.length}`;
    }

    // Fired bricks per (site, YYYY-MM, brick_type) via sorting outputs.
    const output = await this.em.query<
      { site_id: string; ym: string; brick_type_id: string; brick_grade: string; fired: string }[]
    >(
      `
      SELECT pb."site_id", to_char(pe."entry_date", 'YYYY-MM') AS ym,
        pso."brick_type_id", bt."grade" AS brick_grade,
        SUM(pso."quantity")::text AS fired
      FROM "production_sorting_outputs" pso
      JOIN "production_entries" pe ON pe."id" = pso."entry_id" AND pe."deleted_at" IS NULL
      JOIN "production_batches" pb ON pb."id" = pe."batch_id" AND pb."deleted_at" IS NULL
      JOIN "brick_types" bt ON bt."id" = pso."brick_type_id"
      WHERE pb."company_id" = $1 AND pso."deleted_at" IS NULL
        AND pe."entry_date" BETWEEN $2 AND $3${siteClause}${brickClause}
      GROUP BY pb."site_id", to_char(pe."entry_date", 'YYYY-MM'), pso."brick_type_id", bt."grade"
      ORDER BY pb."site_id", to_char(pe."entry_date", 'YYYY-MM'), bt."grade"
      `,
      params,
    );

    // Cost per (site, YYYY-MM, bucket) from the direct and overhead expense ledgers.
    const costParams: unknown[] = [companyId, query.fromDate, query.toDate];
    let costSite = '';
    if (query.siteId) {
      costParams.push(query.siteId);
      costSite = ` AND v."site_id" = $${costParams.length}`;
    }
    const costRows = await this.em.query<{ site_id: string | null; ym: string; code: string; amount: string }[]>(
      `
      SELECT v."site_id", to_char(v."voucher_date", 'YYYY-MM') AS ym, l."code",
        (COALESCE(SUM(vl."debit"), 0) - COALESCE(SUM(vl."credit"), 0))::text AS amount
      FROM "ledgers" l
      JOIN "voucher_lines" vl ON vl."ledger_id" = l."id" AND vl."deleted_at" IS NULL
      JOIN "vouchers" v ON v."id" = vl."voucher_id" AND v."deleted_at" IS NULL
      WHERE l."company_id" = $1 AND l."deleted_at" IS NULL
        AND l."code" IN ('LABOUR_WAGES', 'COAL', 'SOIL', 'ELECTRICITY', 'LOADING_UNLOADING', 'REPAIRS_MAINTENANCE', 'MACHINERY_REPAIRS')
        AND v."voucher_date" BETWEEN $2 AND $3${costSite}
      GROUP BY v."site_id", to_char(v."voucher_date", 'YYYY-MM'), l."code"
      `,
      costParams,
    );

    // Also the "other" bucket: every other direct expense that isn't in the
    // named list. Overhead "MACHINERY_REPAIRS" is counted in Repairs here —
    // that is a presentation choice, not a change to how it posts.
    const otherRows = await this.em.query<{ site_id: string | null; ym: string; amount: string }[]>(
      `
      SELECT v."site_id", to_char(v."voucher_date", 'YYYY-MM') AS ym,
        (COALESCE(SUM(vl."debit"), 0) - COALESCE(SUM(vl."credit"), 0))::text AS amount
      FROM "ledgers" l
      JOIN "ledger_groups" g ON g."id" = l."group_id"
      JOIN "voucher_lines" vl ON vl."ledger_id" = l."id" AND vl."deleted_at" IS NULL
      JOIN "vouchers" v ON v."id" = vl."voucher_id" AND v."deleted_at" IS NULL
      WHERE l."company_id" = $1 AND l."deleted_at" IS NULL
        AND g."nature" = 'expense' AND g."is_direct" = true
        AND l."code" NOT IN ('LABOUR_WAGES', 'COAL', 'SOIL', 'ELECTRICITY', 'LOADING_UNLOADING', 'REPAIRS_MAINTENANCE', 'MACHINERY_REPAIRS', 'VEHICLE_DIESEL', 'FREIGHT_EXPENSE')
        AND v."voucher_date" BETWEEN $2 AND $3${costSite}
      GROUP BY v."site_id", to_char(v."voucher_date", 'YYYY-MM')
      `,
      costParams,
    );

    // Site-month totals of fired bricks — used both for pro-rating and for the
    // benchmark comparison on the row.
    const siteMonthFired = new Map<string, Decimal>();
    for (const r of output) {
      const key = `${r.site_id}|${r.ym}`;
      siteMonthFired.set(key, (siteMonthFired.get(key) ?? new Decimal(0)).plus(r.fired));
    }

    const bucketKey = (site: string, ym: string, code: string) => `${site}|${ym}|${code}`;
    const bucketCosts = new Map<string, Decimal>();
    for (const r of costRows) {
      if (!r.site_id) continue; // vouchers without a kiln are overhead that we can't attribute
      bucketCosts.set(bucketKey(r.site_id, r.ym, r.code), new Decimal(r.amount));
    }
    const otherBucket = new Map<string, Decimal>();
    for (const r of otherRows) {
      if (!r.site_id) continue;
      otherBucket.set(`${r.site_id}|${r.ym}`, new Decimal(r.amount));
    }

    const benchmark = new Decimal(COST_PER_THOUSAND_BENCHMARK);
    const items = output.map((r) => {
      const sharedKey = `${r.site_id}|${r.ym}`;
      const siteTotal = siteMonthFired.get(sharedKey) ?? new Decimal(0);
      const fired = new Decimal(r.fired);
      const share = siteTotal.isZero() ? new Decimal(0) : fired.dividedBy(siteTotal);

      const pick = (code: string): Decimal =>
        (bucketCosts.get(bucketKey(r.site_id, r.ym, code)) ?? new Decimal(0)).times(share);
      const buckets = {
        labour: pick('LABOUR_WAGES'),
        coal: pick('COAL'),
        soil: pick('SOIL'),
        electricity: pick('ELECTRICITY'),
        loading: pick('LOADING_UNLOADING'),
        repairs: pick('REPAIRS_MAINTENANCE').plus(pick('MACHINERY_REPAIRS')),
        other: (otherBucket.get(sharedKey) ?? new Decimal(0)).times(share),
      };
      const totalCost = Object.values(buckets).reduce((a, b) => a.plus(b), new Decimal(0));
      const costPerThousand = safeDivide(totalCost.times(1000), fired);
      const costPerThousandDec = costPerThousand === null ? null : new Decimal(costPerThousand);
      const deltaVsBenchmark = costPerThousandDec === null ? null : money(costPerThousandDec.minus(benchmark));

      return {
        siteId: r.site_id,
        month: r.ym,
        brickTypeId: r.brick_type_id,
        brickTypeGrade: r.brick_grade,
        firedBricks: bricks(fired),
        shareOfKilnMonth: siteTotal.isZero() ? '0.0000' : fired.dividedBy(siteTotal).toFixed(4),
        buckets: {
          labour: money(buckets.labour),
          coal: money(buckets.coal),
          soil: money(buckets.soil),
          electricity: money(buckets.electricity),
          loading: money(buckets.loading),
          repairs: money(buckets.repairs),
          other: money(buckets.other),
        },
        totalCost: money(totalCost),
        costPerThousand,
        benchmark: COST_PER_THOUSAND_BENCHMARK,
        deltaVsBenchmark,
        /** The row is **over benchmark** when the delta is positive. */
        overBenchmark: deltaVsBenchmark === null ? null : new Decimal(deltaVsBenchmark).greaterThan(0),
      };
    });

    return {
      items,
      meta: {
        fromDate: query.fromDate,
        toDate: query.toDate,
        siteId: query.siteId ?? null,
        brickTypeId: query.brickTypeId ?? null,
        rowCount: items.length,
        benchmark: COST_PER_THOUSAND_BENCHMARK,
      },
    };
  }
}

// ── month helpers ──────────────────────────────────────────────────────────

function subtractMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 - n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthRange(fromYm: string, toYm: string): string[] {
  const out: string[] = [];
  let cur = fromYm;
  while (cur <= toYm) {
    out.push(cur);
    const [y, m] = cur.split('-').map(Number) as [number, number];
    const next = new Date(Date.UTC(y, m, 1));
    cur = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  return out;
}

function endOfMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m, 0));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function indexBy<T extends Record<string, unknown>>(rows: T[], key: keyof T): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) map.set(String(row[key]), row);
  return map;
}
