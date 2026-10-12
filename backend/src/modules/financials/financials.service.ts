import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { DataSource, EntityManager } from 'typeorm';
import type {
  BalanceSheetQueryDto,
  ClosingStockQueryDto,
  CloseFinancialYearDto,
  PartyBalancesQueryDto,
  ProfitAndLossQueryDto,
  SetClosingStockRatesDto,
} from '@brics/shared';
import { BusinessRuleException } from '../../common/exceptions/business-rule.exception';
import { todayCalendarDate } from '../../common/time/calendar-date';
import { AuditService } from '../audit/audit.service';
import { FinancialYear } from '../company/entities/financial-year.entity';
import { Ledger } from '../../accounting/entities/ledger.entity';
import { ClosingStockRate } from './entities/closing-stock-rate.entity';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

const money = (v: Decimal.Value): string => new Decimal(v).toFixed(2);
const qty = (v: Decimal.Value): string => new Decimal(v).toFixed(3);

/** One ledger's net movement, as the statements need it. */
interface BalanceRow {
  ledger_id: string;
  ledger_name: string;
  ledger_code: string | null;
  group_code: string;
  group_name: string;
  nature: 'asset' | 'liability' | 'income' | 'expense';
  is_direct: boolean;
  debit: string;
  credit: string;
}

@Injectable()
export class FinancialsService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  // ── closing stock (OQ #4) ──────────────────────────────────────────────────

  async setClosingStockRates(companyId: string, userId: string, dto: SetClosingStockRatesDto) {
    if (dto.asOf > todayCalendarDate()) {
      throw new BusinessRuleException('VALUATION_DATE_IN_FUTURE', 'Stock cannot be valued for a future date');
    }

    return this.dataSource.transaction(async (manager) => {
      const itemIds = dto.rates.map((r) => r.itemId);
      if (new Set(itemIds).size !== itemIds.length) {
        throw new BusinessRuleException('DUPLICATE_ITEM_RATE', 'One grade appears twice in this valuation');
      }
      const found = await manager.query<{ id: string }[]>(
        `SELECT id FROM items WHERE company_id = $1 AND id = ANY($2) AND deleted_at IS NULL`,
        [companyId, itemIds],
      );
      if (found.length !== itemIds.length) {
        throw new BusinessRuleException('ITEM_NOT_FOUND', 'One of the grades does not exist in this company');
      }

      for (const rate of dto.rates) {
        const existing = await manager.findOne(ClosingStockRate, {
          where: { companyId, asOf: dto.asOf, itemId: rate.itemId },
        });
        if (existing) {
          existing.rate = money(rate.rate);
          existing.updatedBy = userId;
          await manager.save(existing);
        } else {
          await manager.save(
            manager.create(ClosingStockRate, {
              companyId,
              createdBy: userId,
              updatedBy: userId,
              asOf: dto.asOf,
              itemId: rate.itemId,
              rate: money(rate.rate),
            }),
          );
        }
      }

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'UPDATE',
          entityName: 'closing_stock_rates',
          entityId: null,
          after: { asOf: dto.asOf, grades: dto.rates.length },
        },
        manager,
      );

      return this.closingStock(companyId, { asOf: dto.asOf }, manager);
    });
  }

  /**
   * What the yard is worth on a date: quantity from the stock ledger, rate from
   * what the owner entered. A grade holding stock with no rate is listed as
   * **unvalued** rather than valued at nothing — the same principle as ADR-037,
   * where a missing wage rate is refused instead of invented.
   */
  async closingStock(companyId: string, query: ClosingStockQueryDto, manager?: EntityManager) {
    const em = manager ?? this.em;

    const params: unknown[] = [companyId, query.asOf];
    let siteFilter = '';
    if (query.siteId) {
      params.push(query.siteId);
      siteFilter = ` AND w."site_id" = $${params.length}`;
    }

    const rows = await em.query<
      { item_id: string; item_name: string; quantity: string; rate: string | null }[]
    >(
      `
      SELECT
        i."id" AS item_id,
        i."name" AS item_name,
        COALESCE(SUM(m."quantity_in") - SUM(m."quantity_out"), 0)::text AS quantity,
        r."rate"::text AS rate
      FROM "items" i
      JOIN "stock_movements" m ON m."item_id" = i."id" AND m."deleted_at" IS NULL AND m."movement_date" <= $2
      JOIN "warehouses" w ON w."id" = m."warehouse_id"
      LEFT JOIN "closing_stock_rates" r
        ON r."item_id" = i."id" AND r."company_id" = i."company_id" AND r."as_of" = $2 AND r."deleted_at" IS NULL
      WHERE i."company_id" = $1 AND i."deleted_at" IS NULL${siteFilter}
      GROUP BY i."id", i."name", r."rate"
      HAVING COALESCE(SUM(m."quantity_in") - SUM(m."quantity_out"), 0) <> 0
      ORDER BY i."name"
      `,
      params,
    );

    const items = rows.map((r) => {
      const quantity = new Decimal(r.quantity);
      const rate = r.rate === null ? null : new Decimal(r.rate);
      return {
        itemId: r.item_id,
        itemName: r.item_name,
        quantity: qty(quantity),
        rate: rate === null ? null : money(rate),
        value: rate === null ? null : money(quantity.times(rate)),
        /** Stock the owner has not priced — it counts as nothing until they do. */
        unvalued: rate === null,
      };
    });

    const valued = items.filter((i) => !i.unvalued);
    return {
      items,
      meta: {
        asOf: query.asOf,
        itemCount: items.length,
        valuedCount: valued.length,
        unvaluedCount: items.length - valued.length,
        totalValue: money(valued.reduce((a, i) => a.plus(i.value ?? 0), new Decimal(0))),
      },
    };
  }

  // ── the balances every statement is built from ─────────────────────────────

  private async balances(
    companyId: string,
    upToDate: string,
    fromDate: string | null,
    siteId?: string,
  ): Promise<BalanceRow[]> {
    const params: unknown[] = [companyId, upToDate];
    let dateFloor = '';
    if (fromDate) {
      params.push(fromDate);
      dateFloor = ` AND v."voucher_date" >= $${params.length}`;
    }
    let siteFilter = '';
    if (siteId) {
      params.push(siteId);
      siteFilter = ` AND v."site_id" = $${params.length}`;
    }

    return this.em.query<BalanceRow[]>(
      `
      SELECT
        l."id" AS ledger_id,
        l."name" AS ledger_name,
        l."code" AS ledger_code,
        g."code" AS group_code,
        g."name" AS group_name,
        g."nature",
        g."is_direct",
        -- The CASE matters: filtering the voucher join alone would leave a
        -- line outside the window still summing, because the LEFT JOIN keeps
        -- the row and only nulls the voucher.
        COALESCE(SUM(CASE WHEN v."id" IS NOT NULL THEN vl."debit" ELSE 0 END), 0)::text AS debit,
        COALESCE(SUM(CASE WHEN v."id" IS NOT NULL THEN vl."credit" ELSE 0 END), 0)::text AS credit
      FROM "ledgers" l
      JOIN "ledger_groups" g ON g."id" = l."group_id"
      LEFT JOIN "voucher_lines" vl ON vl."ledger_id" = l."id" AND vl."deleted_at" IS NULL
      LEFT JOIN "vouchers" v ON v."id" = vl."voucher_id" AND v."deleted_at" IS NULL
        AND v."voucher_date" <= $2${dateFloor}${siteFilter}
      WHERE l."company_id" = $1 AND l."deleted_at" IS NULL
      GROUP BY l."id", l."name", l."code", g."code", g."name", g."nature", g."is_direct"
      `,
      params,
    );
  }

  /** Net amount on the side the group normally sits on. */
  private net(row: BalanceRow): Decimal {
    const debit = new Decimal(row.debit);
    const credit = new Decimal(row.credit);
    return row.nature === 'asset' || row.nature === 'expense' ? debit.minus(credit) : credit.minus(debit);
  }

  // ── ACC-08 Profit & Loss ───────────────────────────────────────────────────

  /**
   * Direct income less direct expenses is gross profit; indirect income less
   * indirect expenses carries it to net profit. Closing stock is added on the
   * income side and opening stock subtracted, which is the standard trading
   * account — and both come from rates the owner entered (OQ #4), so the
   * statement says plainly when a grade was never priced instead of quietly
   * treating it as worthless.
   */
  async profitAndLoss(companyId: string, query: ProfitAndLossQueryDto) {
    if (query.toDate < query.fromDate) {
      throw new BusinessRuleException('DATE_RANGE_INVALID', 'The end of the window is before its start');
    }

    const rows = await this.balances(companyId, query.toDate, query.fromDate, query.siteId);

    const line = (row: BalanceRow) => ({
      ledgerId: row.ledger_id,
      ledgerName: row.ledger_name,
      ledgerCode: row.ledger_code,
      groupName: row.group_name,
      amount: money(this.net(row)),
    });

    const pick = (nature: 'income' | 'expense', isDirect: boolean) =>
      rows
        .filter((r) => r.nature === nature && r.is_direct === isDirect && !this.net(r).isZero())
        .map(line)
        .sort((a, b) => a.ledgerName.localeCompare(b.ledgerName));

    const total = (lines: { amount: string }[]) => lines.reduce((a, l) => a.plus(l.amount), new Decimal(0));

    const directIncome = pick('income', true);
    const directExpenses = pick('expense', true);
    const indirectIncome = pick('income', false);
    const indirectExpenses = pick('expense', false);

    let openingStock: { value: string; unvaluedCount: number } | null = null;
    let closingStock: { value: string; unvaluedCount: number } | null = null;
    if (query.includeStock) {
      const dayBefore = new Date(`${query.fromDate}T00:00:00Z`);
      dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
      const openingAsOf = dayBefore.toISOString().slice(0, 10);

      const [opening, closing] = await Promise.all([
        this.closingStock(companyId, { asOf: openingAsOf, siteId: query.siteId }),
        this.closingStock(companyId, { asOf: query.toDate, siteId: query.siteId }),
      ]);
      // Only report an opening value when somebody actually priced that date;
      // an unpriced opening would otherwise read as "the yard was empty".
      if (opening.meta.valuedCount > 0) {
        openingStock = { value: opening.meta.totalValue, unvaluedCount: opening.meta.unvaluedCount };
      }
      if (closing.meta.itemCount > 0) {
        closingStock = { value: closing.meta.totalValue, unvaluedCount: closing.meta.unvaluedCount };
      }
    }

    const grossIncome = total(directIncome)
      .plus(closingStock?.value ?? 0)
      .minus(openingStock?.value ?? 0);
    const grossProfit = grossIncome.minus(total(directExpenses));
    const netProfit = grossProfit.plus(total(indirectIncome)).minus(total(indirectExpenses));

    return {
      items: [],
      meta: {
        fromDate: query.fromDate,
        toDate: query.toDate,
        directIncome,
        directExpenses,
        indirectIncome,
        indirectExpenses,
        openingStock,
        closingStock,
        totals: {
          directIncome: money(total(directIncome)),
          directExpenses: money(total(directExpenses)),
          indirectIncome: money(total(indirectIncome)),
          indirectExpenses: money(total(indirectExpenses)),
          grossProfit: money(grossProfit),
          netProfit: money(netProfit),
        },
        /**
         * The statement is honest about what it could not price. A reader
         * seeing a figure has to know whether anything was left out of it.
         */
        unvaluedStockGrades: (openingStock?.unvaluedCount ?? 0) + (closingStock?.unvaluedCount ?? 0),
      },
    };
  }

  // ── ACC-08 Balance Sheet ───────────────────────────────────────────────────

  /**
   * Assets against liabilities, with the period's profit carried into the
   * liability side as the owner's earnings. Closing stock is an asset valued
   * from the same rates the P&L used, so the two statements cannot disagree.
   */
  async balanceSheet(companyId: string, query: BalanceSheetQueryDto) {
    const rows = await this.balances(companyId, query.asOf, null, query.siteId);

    const group = (nature: 'asset' | 'liability') => {
      const byGroup = new Map<string, { groupName: string; lines: { ledgerName: string; amount: string }[] }>();
      for (const row of rows) {
        if (row.nature !== nature) continue;
        const amount = this.net(row);
        if (amount.isZero()) continue;
        const bucket = byGroup.get(row.group_code) ?? { groupName: row.group_name, lines: [] };
        bucket.lines.push({ ledgerName: row.ledger_name, amount: money(amount) });
        byGroup.set(row.group_code, bucket);
      }
      return [...byGroup.entries()]
        .map(([groupCode, bucket]) => ({
          groupCode,
          groupName: bucket.groupName,
          lines: bucket.lines.sort((a, b) => a.ledgerName.localeCompare(b.ledgerName)),
          total: money(bucket.lines.reduce((a, l) => a.plus(l.amount), new Decimal(0))),
        }))
        .sort((a, b) => a.groupName.localeCompare(b.groupName));
    };

    const assets = group('asset');
    const liabilities = group('liability');

    // Income less expense to date is the profit sitting in the owner's capital.
    const earned = rows
      .filter((r) => r.nature === 'income' || r.nature === 'expense')
      .reduce((acc, r) => (r.nature === 'income' ? acc.plus(this.net(r)) : acc.minus(this.net(r))), new Decimal(0));

    const stock = await this.closingStock(companyId, { asOf: query.asOf, siteId: query.siteId });
    const stockValue = new Decimal(stock.meta.totalValue);

    const assetTotal = assets.reduce((a, g) => a.plus(g.total), new Decimal(0)).plus(stockValue);
    const liabilityTotal = liabilities.reduce((a, g) => a.plus(g.total), new Decimal(0)).plus(earned);

    return {
      items: [],
      meta: {
        asOf: query.asOf,
        assets,
        liabilities,
        /** Stock-in-hand is not a posted ledger balance — it is the valuation. */
        closingStock: {
          value: money(stockValue),
          unvaluedCount: stock.meta.unvaluedCount,
        },
        retainedEarnings: money(earned),
        totals: {
          assets: money(assetTotal),
          liabilities: money(liabilityTotal),
          /**
           * Zero when the books balance. Non-zero is not hidden: unposted
           * opening balances are a known gap (see PROGRESS), and a reader must
           * see the difference rather than a statement quietly forced to agree.
           */
          difference: money(assetTotal.minus(liabilityTotal)),
        },
        unvaluedStockGrades: stock.meta.unvaluedCount,
      },
    };
  }

  // ── ACC-09 receivables and payables summary ────────────────────────────────

  async partyBalances(companyId: string, query: PartyBalancesQueryDto) {
    const params: unknown[] = [companyId, query.asOf];
    let typeFilter = '';
    if (query.partyType) {
      params.push(query.partyType);
      typeFilter = ` AND $${params.length} = ANY(p."party_types")`;
    }

    const rows = await this.em.query<
      { party_id: string; name: string; party_types: string[]; debit: string; credit: string }[]
    >(
      `
      SELECT
        p."id" AS party_id,
        p."name",
        p."party_types",
        COALESCE(SUM(CASE WHEN v."id" IS NOT NULL THEN vl."debit" ELSE 0 END), 0)::text AS debit,
        COALESCE(SUM(CASE WHEN v."id" IS NOT NULL THEN vl."credit" ELSE 0 END), 0)::text AS credit
      FROM "parties" p
      LEFT JOIN "ledgers" l ON l."party_id" = p."id" AND l."deleted_at" IS NULL
      LEFT JOIN "voucher_lines" vl ON vl."ledger_id" = l."id" AND vl."deleted_at" IS NULL
      LEFT JOIN "vouchers" v ON v."id" = vl."voucher_id" AND v."deleted_at" IS NULL AND v."voucher_date" <= $2
      WHERE p."company_id" = $1 AND p."deleted_at" IS NULL${typeFilter}
      GROUP BY p."id", p."name", p."party_types"
      ORDER BY p."name"
      `,
      params,
    );

    const items = rows
      .map((r) => {
        const net = new Decimal(r.debit).minus(r.credit);
        return {
          partyId: r.party_id,
          name: r.name,
          partyTypes: r.party_types,
          /** Debit on a party ledger means they owe the kiln. */
          receivable: net.greaterThan(0) ? money(net) : '0.00',
          payable: net.lessThan(0) ? money(net.negated()) : '0.00',
          net: money(net),
        };
      })
      .filter((r) => query.includeSettled || r.net !== '0.00');

    const sum = (pick: (r: (typeof items)[number]) => string) =>
      money(items.reduce((a, r) => a.plus(pick(r)), new Decimal(0)));

    return {
      items,
      meta: {
        asOf: query.asOf,
        partyCount: items.length,
        receivable: sum((r) => r.receivable),
        payable: sum((r) => r.payable),
        net: sum((r) => r.net),
      },
    };
  }

  // ── ACC-10 financial year lock and carry-forward ───────────────────────────

  /**
   * Closing a year writes each balance-sheet ledger's closing balance as the
   * next year's opening balance, and locks the year behind it.
   *
   * Income and expense ledgers are **not** carried: they start every year at
   * zero, and their net is the profit the owner has already taken into capital.
   * `closed_at` is what stops this running twice — a second run would double
   * every opening balance, and the Balance Sheet would be wrong by a year.
   */
  async closeFinancialYear(companyId: string, userId: string, dto: CloseFinancialYearDto) {
    return this.dataSource.transaction(async (manager) => {
      const year = await manager.findOne(FinancialYear, { where: { id: dto.financialYearId, companyId } });
      if (!year) throw new BusinessRuleException('FINANCIAL_YEAR_NOT_FOUND', 'That financial year does not exist');
      if (year.closedAt) {
        throw new BusinessRuleException(
          'FINANCIAL_YEAR_ALREADY_CLOSED',
          `${year.name} was already closed — its balances are in the next year`,
        );
      }
      if (year.endDate > todayCalendarDate()) {
        throw new BusinessRuleException(
          'FINANCIAL_YEAR_NOT_OVER',
          `${year.name} runs to ${year.endDate} — it cannot be closed before it ends`,
        );
      }

      const next = await manager.findOne(FinancialYear, { where: { id: dto.nextFinancialYearId, companyId } });
      if (!next) throw new BusinessRuleException('FINANCIAL_YEAR_NOT_FOUND', 'That next year does not exist');
      const dayAfter = new Date(`${year.endDate}T00:00:00Z`);
      dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
      if (next.startDate !== dayAfter.toISOString().slice(0, 10)) {
        throw new BusinessRuleException(
          'FINANCIAL_YEARS_NOT_CONSECUTIVE',
          `${next.name} does not start the day after ${year.name} ends`,
        );
      }

      const rows = await manager.query<BalanceRow[]>(
        `
        SELECT
          l."id" AS ledger_id, l."name" AS ledger_name, l."code" AS ledger_code,
          g."code" AS group_code, g."name" AS group_name, g."nature", g."is_direct",
          COALESCE(SUM(CASE WHEN v."id" IS NOT NULL THEN vl."debit" ELSE 0 END), 0)::text AS debit,
          COALESCE(SUM(CASE WHEN v."id" IS NOT NULL THEN vl."credit" ELSE 0 END), 0)::text AS credit
        FROM "ledgers" l
        JOIN "ledger_groups" g ON g."id" = l."group_id"
        LEFT JOIN "voucher_lines" vl ON vl."ledger_id" = l."id" AND vl."deleted_at" IS NULL
        LEFT JOIN "vouchers" v ON v."id" = vl."voucher_id" AND v."deleted_at" IS NULL
          AND v."voucher_date" <= $2
        WHERE l."company_id" = $1 AND l."deleted_at" IS NULL
          AND g."nature" IN ('asset','liability')
        GROUP BY l."id", l."name", l."code", g."code", g."name", g."nature", g."is_direct"
        `,
        [companyId, year.endDate],
      );

      let carried = 0;
      for (const row of rows) {
        const debit = new Decimal(row.debit);
        const credit = new Decimal(row.credit);
        const net = debit.minus(credit);
        if (net.isZero()) continue;

        await manager.update(
          Ledger,
          { id: row.ledger_id, companyId },
          {
            openingDebit: net.greaterThan(0) ? money(net) : '0.00',
            openingCredit: net.lessThan(0) ? money(net.negated()) : '0.00',
            openingFinancialYearId: next.id,
            updatedBy: userId,
          },
        );
        carried += 1;
      }

      year.isLocked = true;
      year.isActive = false;
      year.closedAt = new Date();
      year.closedBy = userId;
      await manager.save(year);

      // Exactly one year is active per company (a partial unique index enforces
      // it). After a close the next year is the active one, so every other year
      // stands down first — including the one just closed.
      await manager.update(FinancialYear, { companyId }, { isActive: false });
      next.isActive = true;
      await manager.save(next);

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'UPDATE',
          entityName: 'financial_years',
          entityId: year.id,
          before: { isLocked: false, closedAt: null },
          after: { isLocked: true, closedAt: year.closedAt, carriedLedgers: carried, into: next.name },
        },
        manager,
      );

      return { financialYear: year, nextFinancialYear: next, carriedLedgers: carried };
    });
  }
}
