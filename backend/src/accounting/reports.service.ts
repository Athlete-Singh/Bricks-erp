import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { Repository } from 'typeorm';
import type { DayBookQueryDto, LedgerStatementQueryDto, TrialBalanceQueryDto } from '@brics/shared';
import { normalBalanceSide, type LedgerNature } from '@brics/shared';
import type { Paginated } from '../common/interceptors/response-envelope.interceptor';
import { Money } from '../common/money/money';
import { LedgerGroup } from './entities/ledger-group.entity';
import { Ledger } from './entities/ledger.entity';
import { Voucher } from './entities/voucher.entity';
import { VoucherLine } from './entities/voucher-line.entity';

/** One voucher as the Day Book shows it: the entry plus what it moved. */
export interface DayBookEntry {
  voucherId: string;
  number: string;
  voucherDate: string;
  voucherType: string;
  status: string;
  narration: string | null;
  lines: Array<{ ledgerId: string; ledgerName: string; debit: string; credit: string; narration: string | null }>;
  totalDebit: string;
}

export interface LedgerStatementRow {
  voucherId: string;
  number: string;
  voucherDate: string;
  voucherType: string;
  narration: string | null;
  debit: string;
  credit: string;
  /** Signed, on the ledger's natural side. */
  runningBalance: string;
}

export interface LedgerStatement {
  ledger: { id: string; name: string; code: string | null };
  group: { id: string; name: string; nature: LedgerNature };
  /** Opening balance + everything before `from`. */
  opening: { debit: string; credit: string };
  rows: LedgerStatementRow[];
  totals: { debit: string; credit: string };
  closing: { debit: string; credit: string };
}

export interface TrialBalanceRow {
  ledgerId: string;
  ledgerName: string;
  groupId: string;
  groupName: string;
  nature: LedgerNature;
  openingDebit: string;
  openingCredit: string;
  periodDebit: string;
  periodCredit: string;
  closingDebit: string;
  closingCredit: string;
}

export interface TrialBalance {
  asOf: string;
  rows: TrialBalanceRow[];
  totals: {
    openingDebit: string;
    openingCredit: string;
    periodDebit: string;
    periodCredit: string;
    closingDebit: string;
    closingCredit: string;
  };
  /** Σ closing debits = Σ closing credits. False means the openings do not tie. */
  isBalanced: boolean;
  difference: string;
}

/**
 * The books (ACC-05): Day Book, Ledger statement and Trial Balance.
 *
 * Read-only. Every figure is derived from `voucher_lines` plus the ledger's
 * opening balance — nothing is cached, so a report can never disagree with the
 * journal it is built from.
 *
 * Reversed vouchers stay in. The original and its mirror both appear and net to
 * zero, which is what makes the trail auditable; hiding them would make the
 * books agree with themselves but not with what happened.
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Voucher) private voucherRepo: Repository<Voucher>,
    @InjectRepository(VoucherLine) private lineRepo: Repository<VoucherLine>,
    @InjectRepository(Ledger) private ledgerRepo: Repository<Ledger>,
    @InjectRepository(LedgerGroup) private groupRepo: Repository<LedgerGroup>,
  ) {}

  // ── Day Book ───────────────────────────────────────────────────────────────

  async dayBook(companyId: string, query: DayBookQueryDto): Promise<Paginated<DayBookEntry>> {
    const qb = this.voucherRepo
      .createQueryBuilder('v')
      .where('v.company_id = :companyId', { companyId })
      .orderBy('v.voucher_date', 'DESC')
      .addOrderBy('v.number', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.from) qb.andWhere('v.voucher_date >= :from', { from: query.from });
    if (query.to) qb.andWhere('v.voucher_date <= :to', { to: query.to });
    if (query.voucherType) {
      // A subquery rather than a join: TypeORM builds a DISTINCT subquery for
      // skip/take, and it cannot do that across a join to a raw table name.
      qb.andWhere(
        'v.voucher_type_id IN (SELECT id FROM voucher_types WHERE company_id = :companyId AND code = :voucherType)',
        { companyId, voucherType: query.voucherType },
      );
    }

    const [vouchers, total] = await qb.getManyAndCount();
    if (vouchers.length === 0) {
      return { items: [], meta: { page: query.page, limit: query.limit, total } };
    }

    // One round trip for the lines of the whole page, rather than per voucher.
    const rows = await this.lineRepo
      .createQueryBuilder('vl')
      .innerJoin('ledgers', 'l', 'l.id = vl.ledger_id')
      .select([
        'vl.voucher_id AS "voucherId"',
        'vl.ledger_id AS "ledgerId"',
        'l.name AS "ledgerName"',
        'vl.debit AS debit',
        'vl.credit AS credit',
        'vl.narration AS narration',
      ])
      .where('vl.voucher_id IN (:...ids)', { ids: vouchers.map((v) => v.id) })
      .orderBy('vl.line_order', 'ASC')
      .getRawMany<{
        voucherId: string;
        ledgerId: string;
        ledgerName: string;
        debit: string;
        credit: string;
        narration: string | null;
      }>();

    const typeCodes = await this.voucherTypeCodes(companyId);
    const linesByVoucher = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = linesByVoucher.get(row.voucherId) ?? [];
      list.push(row);
      linesByVoucher.set(row.voucherId, list);
    }

    const items: DayBookEntry[] = vouchers.map((voucher) => {
      const lines = linesByVoucher.get(voucher.id) ?? [];
      return {
        voucherId: voucher.id,
        number: voucher.number,
        voucherDate: voucher.voucherDate,
        voucherType: typeCodes.get(voucher.voucherTypeId) ?? 'unknown',
        status: voucher.status,
        narration: voucher.narration,
        lines: lines.map((l) => ({
          ledgerId: l.ledgerId,
          ledgerName: l.ledgerName,
          debit: Money.toString(l.debit),
          credit: Money.toString(l.credit),
          narration: l.narration,
        })),
        // A balanced voucher's debit total is its value.
        totalDebit: Money.toString(Money.sum(lines.map((l) => l.debit))),
      };
    });

    return { items, meta: { page: query.page, limit: query.limit, total } };
  }

  // ── Ledger statement ───────────────────────────────────────────────────────

  async ledgerStatement(companyId: string, ledgerId: string, query: LedgerStatementQueryDto): Promise<LedgerStatement> {
    const ledger = await this.ledgerRepo.findOne({ where: { id: ledgerId, companyId } });
    if (!ledger) throw new NotFoundException('Ledger not found');
    const group = await this.groupRepo.findOneOrFail({ where: { id: ledger.groupId } });

    // Opening = the ledger's own opening balance plus everything before `from`.
    const priorMovement = query.from
      ? await this.movementTotals(companyId, ledgerId, { before: query.from })
      : { debit: new Decimal(0), credit: new Decimal(0) };

    const openingNet = Money.of(ledger.openingDebit)
      .minus(ledger.openingCredit)
      .plus(priorMovement.debit)
      .minus(priorMovement.credit);

    const lines = await this.lineRepo
      .createQueryBuilder('vl')
      .innerJoin('vouchers', 'v', 'v.id = vl.voucher_id')
      .innerJoin('voucher_types', 'vt', 'vt.id = v.voucher_type_id')
      .select([
        'v.id AS "voucherId"',
        'v.number AS number',
        'v.voucher_date AS "voucherDate"',
        'vt.code AS "voucherType"',
        'COALESCE(vl.narration, v.narration) AS narration',
        'vl.debit AS debit',
        'vl.credit AS credit',
      ])
      .where('vl.company_id = :companyId', { companyId })
      .andWhere('vl.ledger_id = :ledgerId', { ledgerId })
      .andWhere(query.from ? 'v.voucher_date >= :from' : '1=1', { from: query.from })
      .andWhere(query.to ? 'v.voucher_date <= :to' : '1=1', { to: query.to })
      .orderBy('v.voucher_date', 'ASC')
      .addOrderBy('v.number', 'ASC')
      .getRawMany<{
        voucherId: string;
        number: string;
        voucherDate: string | Date;
        voucherType: string;
        narration: string | null;
        debit: string;
        credit: string;
      }>();

    let running = openingNet;
    const rows: LedgerStatementRow[] = lines.map((line) => {
      running = running.plus(line.debit).minus(line.credit);
      return {
        voucherId: line.voucherId,
        number: line.number,
        voucherDate: toIsoDate(line.voucherDate),
        voucherType: line.voucherType,
        narration: line.narration,
        debit: Money.toString(line.debit),
        credit: Money.toString(line.credit),
        runningBalance: Money.toString(this.onNaturalSide(running, group.nature)),
      };
    });

    return {
      ledger: { id: ledger.id, name: ledger.name, code: ledger.code },
      group: { id: group.id, name: group.name, nature: group.nature },
      opening: splitSides(openingNet),
      rows,
      totals: {
        debit: Money.toString(Money.sum(lines.map((l) => l.debit))),
        credit: Money.toString(Money.sum(lines.map((l) => l.credit))),
      },
      closing: splitSides(running),
    };
  }

  // ── Trial Balance ──────────────────────────────────────────────────────────

  /**
   * Every ledger's closing balance, grouped, with Σ debit vs Σ credit proved.
   *
   * If it does not balance the cause is the opening balances, not the journals:
   * `PostingService` cannot write an unbalanced voucher, but opening figures are
   * deliberately allowed not to tie (ACC-04). The difference is reported so the
   * owner can see what is still unexplained.
   */
  async trialBalance(companyId: string, query: TrialBalanceQueryDto): Promise<TrialBalance> {
    const asOf = query.asOf ?? new Date().toISOString().slice(0, 10);

    const [ledgers, groups] = await Promise.all([
      this.ledgerRepo.find({ where: { companyId } }),
      this.groupRepo.find({ where: { companyId } }),
    ]);
    const groupById = new Map(groups.map((g) => [g.id, g]));

    // Anything dated before `from` is folded into the opening balance.
    const priorTotals = query.from
      ? await this.movementByLedger(companyId, { before: query.from })
      : new Map<string, { debit: Decimal; credit: Decimal }>();
    const periodTotals = await this.movementByLedger(companyId, { from: query.from, to: asOf });

    const rows: TrialBalanceRow[] = [];
    let totalOpeningDebit = new Decimal(0);
    let totalOpeningCredit = new Decimal(0);
    let totalPeriodDebit = new Decimal(0);
    let totalPeriodCredit = new Decimal(0);
    let totalClosingDebit = new Decimal(0);
    let totalClosingCredit = new Decimal(0);

    for (const ledger of ledgers) {
      const group = groupById.get(ledger.groupId);
      if (!group) continue;

      const prior = priorTotals.get(ledger.id) ?? { debit: new Decimal(0), credit: new Decimal(0) };
      const period = periodTotals.get(ledger.id) ?? { debit: new Decimal(0), credit: new Decimal(0) };

      const openingNet = Money.of(ledger.openingDebit)
        .minus(ledger.openingCredit)
        .plus(prior.debit)
        .minus(prior.credit);
      const closingNet = openingNet.plus(period.debit).minus(period.credit);

      const hasActivity =
        !openingNet.isZero() || !period.debit.isZero() || !period.credit.isZero() || !closingNet.isZero();
      if (!hasActivity && !query.includeZero) continue;

      const opening = splitSides(openingNet);
      const closing = splitSides(closingNet);

      rows.push({
        ledgerId: ledger.id,
        ledgerName: ledger.name,
        groupId: group.id,
        groupName: group.name,
        nature: group.nature,
        openingDebit: opening.debit,
        openingCredit: opening.credit,
        periodDebit: Money.toString(period.debit),
        periodCredit: Money.toString(period.credit),
        closingDebit: closing.debit,
        closingCredit: closing.credit,
      });

      totalOpeningDebit = totalOpeningDebit.plus(opening.debit);
      totalOpeningCredit = totalOpeningCredit.plus(opening.credit);
      totalPeriodDebit = totalPeriodDebit.plus(period.debit);
      totalPeriodCredit = totalPeriodCredit.plus(period.credit);
      totalClosingDebit = totalClosingDebit.plus(closing.debit);
      totalClosingCredit = totalClosingCredit.plus(closing.credit);
    }

    rows.sort((a, b) => a.groupName.localeCompare(b.groupName) || a.ledgerName.localeCompare(b.ledgerName));
    const difference = totalClosingDebit.minus(totalClosingCredit);

    return {
      asOf,
      rows,
      totals: {
        openingDebit: Money.toString(totalOpeningDebit),
        openingCredit: Money.toString(totalOpeningCredit),
        periodDebit: Money.toString(totalPeriodDebit),
        periodCredit: Money.toString(totalPeriodCredit),
        closingDebit: Money.toString(totalClosingDebit),
        closingCredit: Money.toString(totalClosingCredit),
      },
      isBalanced: difference.isZero(),
      difference: Money.toString(difference),
    };
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  /** A balance shown positive on its own natural side, negative when contrary. */
  private onNaturalSide(net: Decimal, nature: LedgerNature): Decimal {
    return normalBalanceSide(nature) === 'debit' ? net : net.negated();
  }

  private async movementTotals(
    companyId: string,
    ledgerId: string,
    range: { from?: string; to?: string; before?: string },
  ): Promise<{ debit: Decimal; credit: Decimal }> {
    const totals = await this.movementByLedger(companyId, range, ledgerId);
    return totals.get(ledgerId) ?? { debit: new Decimal(0), credit: new Decimal(0) };
  }

  /** Σ debit and Σ credit per ledger over a date range, in one query. */
  private async movementByLedger(
    companyId: string,
    range: { from?: string; to?: string; before?: string },
    ledgerId?: string,
  ): Promise<Map<string, { debit: Decimal; credit: Decimal }>> {
    const qb = this.lineRepo
      .createQueryBuilder('vl')
      .innerJoin('vouchers', 'v', 'v.id = vl.voucher_id')
      .select('vl.ledger_id', 'ledgerId')
      .addSelect('SUM(vl.debit)', 'debit')
      .addSelect('SUM(vl.credit)', 'credit')
      .where('vl.company_id = :companyId', { companyId })
      .groupBy('vl.ledger_id');

    if (ledgerId) qb.andWhere('vl.ledger_id = :ledgerId', { ledgerId });
    if (range.before) qb.andWhere('v.voucher_date < :before', { before: range.before });
    if (range.from) qb.andWhere('v.voucher_date >= :from', { from: range.from });
    if (range.to) qb.andWhere('v.voucher_date <= :to', { to: range.to });

    const rows = await qb.getRawMany<{ ledgerId: string; debit: string | null; credit: string | null }>();
    return new Map(rows.map((r) => [r.ledgerId, { debit: Money.of(r.debit ?? 0), credit: Money.of(r.credit ?? 0) }]));
  }

  private async voucherTypeCodes(companyId: string): Promise<Map<string, string>> {
    const rows = await this.voucherRepo.manager.query<Array<{ id: string; code: string }>>(
      'SELECT id, code FROM voucher_types WHERE company_id = $1',
      [companyId],
    );
    return new Map(rows.map((r) => [r.id, r.code]));
  }
}

/** A signed net turned into the debit/credit pair a report column needs. */
function splitSides(net: Decimal): { debit: string; credit: string } {
  return net.isNegative()
    ? { debit: '0.00', credit: Money.toString(net.negated()) }
    : { debit: Money.toString(net), credit: '0.00' };
}

/** `pg` hands back a `date` column as a string here and a Date elsewhere. */
function toIsoDate(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}
