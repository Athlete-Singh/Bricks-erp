import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { DataSource, EntityManager } from 'typeorm';
import type { CashBookQueryDto, CreateExpenseDto, ExpenseQueryDto } from '@brics/shared';
import { PostingService } from '../../accounting/posting.service';
import { Ledger } from '../../accounting/entities/ledger.entity';
import { LedgerGroup } from '../../accounting/entities/ledger-group.entity';
import { BusinessRuleException } from '../../common/exceptions/business-rule.exception';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { todayCalendarDate } from '../../common/time/calendar-date';
import { AuditService } from '../audit/audit.service';
import { Party } from '../parties/entities/party.entity';
import { Site } from '../company/entities/site.entity';
import { Expense } from './entities/expense.entity';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

const money = (v: Decimal.Value): string => new Decimal(v).toFixed(2);

function assertNotFuture(date: string, label: string): void {
  const today = todayCalendarDate();
  if (date > today) {
    throw new BusinessRuleException('EXPENSE_DATE_IN_FUTURE', `${label} cannot be dated after today (${today})`);
  }
}

/** The groups an EXP-01 category may live under. */
const EXPENSE_GROUPS = ['DIRECT_EXPENSES', 'INDIRECT_EXPENSES'] as const;
/** The groups money can physically leave from. */
const MONEY_GROUPS = ['CASH_IN_HAND', 'BANK_ACCOUNTS'] as const;

@Injectable()
export class ExpensesService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly dataSource: DataSource,
    private readonly posting: PostingService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
  ) {}

  // ── EXP-01 categories ──────────────────────────────────────────────────────

  /**
   * The expense ledgers, which *are* the categories — there is no second list
   * to drift out of step with the chart of accounts. An owner who adds a ledger
   * under Direct or Indirect Expenses has added a category.
   */
  async listCategories(companyId: string) {
    const rows = await this.em
      .createQueryBuilder(Ledger, 'l')
      .innerJoin(LedgerGroup, 'g', 'g.id = l.group_id')
      .where('l.company_id = :companyId', { companyId })
      .andWhere('l.deleted_at IS NULL')
      .andWhere('l.is_active = true')
      .andWhere('g.code IN (:...groups)', { groups: EXPENSE_GROUPS })
      .orderBy('g.code', 'ASC')
      .addOrderBy('l.name', 'ASC')
      .select(['l.id AS id', 'l.name AS name', 'l.code AS code', 'g.code AS group_code'])
      .getRawMany<{ id: string; name: string; code: string | null; group_code: string }>();

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      /** Direct costs feed cost-per-1,000; indirect ones do not. */
      kind: r.group_code === 'DIRECT_EXPENSES' ? ('direct' as const) : ('indirect' as const),
    }));
  }

  // ── EXP-02 expense entry ───────────────────────────────────────────────────

  private async nextExpenseNo(manager: EntityManager, companyId: string): Promise<string> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`EXP:${companyId}`]);
    const rows = await manager.query<{ n: string | null }[]>(
      `SELECT MAX(NULLIF(regexp_replace("expense_no", '\\D', '', 'g'), '')::bigint) AS n
         FROM "expenses" WHERE "company_id" = $1`,
      [companyId],
    );
    return `EXP-${String(Number(rows[0]?.n ?? 0) + 1).padStart(5, '0')}`;
  }

  private async ledgerInGroups(
    manager: EntityManager,
    companyId: string,
    ledgerId: string,
    groups: readonly string[],
    code: string,
    message: string,
  ): Promise<Ledger> {
    const ledger = await manager.findOne(Ledger, { where: { id: ledgerId, companyId } });
    if (!ledger) throw new BusinessRuleException('LEDGER_NOT_FOUND', 'That account does not exist');
    const group = await manager.findOne(LedgerGroup, { where: { id: ledger.groupId, companyId } });
    if (!group || !groups.includes(group.code)) {
      throw new BusinessRuleException(code, message);
    }
    return ledger;
  }

  async createExpense(
    companyId: string,
    userId: string,
    dto: CreateExpenseDto,
    idempotencyKey: string | null = null,
  ): Promise<Expense> {
    assertNotFuture(dto.expenseDate, 'An expense');

    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        { companyId, userId, endpoint: 'POST /expenses', key: idempotencyKey, body: dto },
        async () => {
          const site = await manager.findOne(Site, { where: { id: dto.siteId, companyId } });
          if (!site) throw new BusinessRuleException('SITE_NOT_FOUND', 'That kiln does not exist');

          // The category has to be an expense account. Booking a cost against
          // a bank ledger would balance and still be nonsense in the P&L.
          const category = await this.ledgerInGroups(
            manager,
            companyId,
            dto.categoryLedgerId,
            EXPENSE_GROUPS,
            'NOT_AN_EXPENSE_LEDGER',
            'That account is not an expense category',
          );

          let creditLedgerId: string;
          let creditPartyId: string | null = null;
          let narrationTail: string;

          if (dto.mode === 'credit') {
            const party = await manager.findOne(Party, { where: { id: dto.partyId!, companyId } });
            if (!party) throw new BusinessRuleException('PARTY_NOT_FOUND', 'That party does not exist');
            if (!party.isActive) {
              throw new BusinessRuleException('PARTY_INACTIVE', `${party.name} is no longer in use`);
            }
            creditLedgerId = party.ledgerId;
            creditPartyId = party.id;
            narrationTail = `owed to ${party.name}`;
          } else {
            // Likewise the other way: money cannot leave an account that is not
            // cash or a bank.
            const paidFrom = await this.ledgerInGroups(
              manager,
              companyId,
              dto.paidFromLedgerId!,
              MONEY_GROUPS,
              'NOT_A_CASH_OR_BANK_LEDGER',
              'Money can only leave a cash or bank account',
            );
            creditLedgerId = paidFrom.id;
            narrationTail = `paid from ${paidFrom.name}`;
          }

          const posted = await this.posting.post(manager, {
            companyId,
            userId,
            // Money out is a payment; a charge still owed is a journal. Calling
            // an unpaid charge a payment would put it in the cash book.
            voucherTypeCode: dto.mode === 'credit' ? 'journal' : 'payment',
            voucherDate: dto.expenseDate,
            siteId: dto.siteId,
            narration: `${category.name} — ${narrationTail}${dto.description ? `: ${dto.description}` : ''}`,
            sourceType: 'expense',
            instrumentType: dto.instrumentType ?? null,
            instrumentRef: dto.instrumentRef ?? null,
            lines: [
              { ledgerId: category.id, debit: money(dto.amount), credit: '0.00', siteId: dto.siteId },
              {
                ledgerId: creditLedgerId,
                debit: '0.00',
                credit: money(dto.amount),
                siteId: dto.siteId,
                partyId: creditPartyId,
              },
            ] as never,
          });

          const expense = await manager.save(
            manager.create(Expense, {
              companyId,
              createdBy: userId,
              updatedBy: userId,
              expenseNo: await this.nextExpenseNo(manager, companyId),
              siteId: dto.siteId,
              categoryLedgerId: category.id,
              expenseDate: dto.expenseDate,
              amount: money(dto.amount),
              mode: dto.mode,
              paidFromLedgerId: dto.mode === 'credit' ? null : dto.paidFromLedgerId!,
              partyId: dto.mode === 'credit' ? dto.partyId! : null,
              instrumentType: dto.instrumentType ?? null,
              instrumentRef: dto.instrumentRef ?? null,
              voucherId: posted.voucher.id,
              description: dto.description ?? null,
              notes: dto.notes ?? null,
            }),
          );

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'expenses',
              entityId: expense.id,
              after: {
                expenseNo: expense.expenseNo,
                category: category.name,
                amount: expense.amount,
                mode: expense.mode,
              },
            },
            manager,
          );

          return expense;
        },
      ),
    );
  }

  async listExpenses(companyId: string, query: ExpenseQueryDto) {
    const qb = this.em
      .createQueryBuilder(Expense, 'e')
      .where('e.company_id = :companyId', { companyId })
      .andWhere('e.deleted_at IS NULL');

    if (query.siteId) qb.andWhere('e.site_id = :siteId', { siteId: query.siteId });
    if (query.categoryLedgerId) {
      qb.andWhere('e.category_ledger_id = :categoryLedgerId', { categoryLedgerId: query.categoryLedgerId });
    }
    if (query.mode) qb.andWhere('e.mode = :mode', { mode: query.mode });
    if (query.partyId) qb.andWhere('e.party_id = :partyId', { partyId: query.partyId });
    if (query.fromDate) qb.andWhere('e.expense_date >= :fromDate', { fromDate: query.fromDate });
    if (query.toDate) qb.andWhere('e.expense_date <= :toDate', { toDate: query.toDate });

    const [items, total] = await qb
      .orderBy('e.expense_date', 'DESC')
      .addOrderBy('e.expense_no', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { items, meta: { page: query.page, limit: query.limit, total } };
  }

  // ── ACC-07 cash book and bank book ─────────────────────────────────────────

  /**
   * Opening, every movement in the window, and closing.
   *
   * This is the same arithmetic as a ledger statement, but asked the way an
   * owner asks it — "the cash", not "ledger such-and-such" — so it spans every
   * cash (or bank) account unless one is named. Opening is everything before
   * the window, including the ledger's own opening balance, which is what makes
   * `opening + in − out = closing` hold rather than merely look right.
   */
  async book(companyId: string, kind: 'cash' | 'bank', query: CashBookQueryDto) {
    if (query.toDate < query.fromDate) {
      throw new BusinessRuleException('DATE_RANGE_INVALID', 'The end of the window is before its start');
    }

    const groupCode = kind === 'cash' ? 'CASH_IN_HAND' : 'BANK_ACCOUNTS';
    const accounts = await this.em
      .createQueryBuilder(Ledger, 'l')
      .innerJoin(LedgerGroup, 'g', 'g.id = l.group_id')
      .where('l.company_id = :companyId', { companyId })
      .andWhere('l.deleted_at IS NULL')
      .andWhere('g.code = :groupCode', { groupCode })
      .andWhere(query.ledgerId ? 'l.id = :ledgerId' : '1=1', { ledgerId: query.ledgerId })
      .select(['l.id AS id', 'l.name AS name', 'l.opening_debit AS opening_debit', 'l.opening_credit AS opening_credit'])
      .getRawMany<{ id: string; name: string; opening_debit: string; opening_credit: string }>();

    if (accounts.length === 0) {
      if (query.ledgerId) {
        throw new BusinessRuleException(
          kind === 'cash' ? 'NOT_A_CASH_LEDGER' : 'NOT_A_BANK_LEDGER',
          `That account is not ${kind === 'cash' ? 'a cash' : 'a bank'} account`,
        );
      }
      return { items: [], meta: this.emptyBookMeta(query) };
    }

    const ids = accounts.map((a) => a.id);
    const params: unknown[] = [companyId, ids, query.fromDate, query.toDate];
    let siteFilter = '';
    if (query.siteId) {
      params.push(query.siteId);
      siteFilter = ` AND v."site_id" = $${params.length}`;
    }

    const rows = await this.em.query<
      {
        ledger_id: string;
        voucher_id: string;
        number: string;
        voucher_date: string;
        voucher_type: string;
        narration: string | null;
        instrument_type: string | null;
        instrument_ref: string | null;
        counterparty: string | null;
        debit: string;
        credit: string;
      }[]
    >(
      `
      SELECT
        vl."ledger_id",
        v."id" AS voucher_id,
        v."number",
        -- ::text, so a date column does not come back as a JS Date and read a
        -- day early east of Greenwich.
        v."voucher_date"::text AS voucher_date,
        vt."code" AS voucher_type,
        v."narration",
        v."instrument_type",
        v."instrument_ref",
        (
          SELECT string_agg(DISTINCT l2."name", ', ')
            FROM "voucher_lines" vl2
            JOIN "ledgers" l2 ON l2."id" = vl2."ledger_id"
           WHERE vl2."voucher_id" = v."id" AND vl2."id" <> vl."id" AND vl2."deleted_at" IS NULL
        ) AS counterparty,
        vl."debit"::text,
        vl."credit"::text
      FROM "voucher_lines" vl
      JOIN "vouchers" v ON v."id" = vl."voucher_id"
      JOIN "voucher_types" vt ON vt."id" = v."voucher_type_id"
      WHERE vl."company_id" = $1
        AND vl."ledger_id" = ANY($2)
        AND vl."deleted_at" IS NULL
        AND v."deleted_at" IS NULL
        AND v."voucher_date" BETWEEN $3 AND $4${siteFilter}
      ORDER BY v."voucher_date" ASC, v."number" ASC
      `,
      params,
    );

    const beforeParams: unknown[] = [companyId, ids, query.fromDate];
    const before = await this.em.query<{ ledger_id: string; debit: string; credit: string }[]>(
      `
      SELECT vl."ledger_id", COALESCE(SUM(vl."debit"), 0)::text AS debit, COALESCE(SUM(vl."credit"), 0)::text AS credit
        FROM "voucher_lines" vl
        JOIN "vouchers" v ON v."id" = vl."voucher_id"
       WHERE vl."company_id" = $1 AND vl."ledger_id" = ANY($2)
         AND vl."deleted_at" IS NULL AND v."deleted_at" IS NULL
         AND v."voucher_date" < $3
       GROUP BY vl."ledger_id"
      `,
      beforeParams,
    );
    const beforeByLedger = new Map(before.map((b) => [b.ledger_id, b]));

    const items = accounts.map((account) => {
      const prior = beforeByLedger.get(account.id);
      // A cash or bank account is an asset: debit is money in.
      const opening = new Decimal(account.opening_debit)
        .minus(account.opening_credit)
        .plus(prior ? new Decimal(prior.debit).minus(prior.credit) : 0);

      let running = opening;
      const entries = rows
        .filter((r) => r.ledger_id === account.id)
        .map((r) => {
          running = running.plus(r.debit).minus(r.credit);
          return {
            voucherId: r.voucher_id,
            number: r.number,
            date: r.voucher_date,
            voucherType: r.voucher_type,
            narration: r.narration,
            instrumentType: r.instrument_type,
            instrumentRef: r.instrument_ref,
            /** The other side of the entry — where the money came from or went. */
            counterparty: r.counterparty,
            moneyIn: money(r.debit),
            moneyOut: money(r.credit),
            balance: money(running),
          };
        });

      const totalIn = entries.reduce((a, e) => a.plus(e.moneyIn), new Decimal(0));
      const totalOut = entries.reduce((a, e) => a.plus(e.moneyOut), new Decimal(0));

      return {
        ledgerId: account.id,
        ledgerName: account.name,
        opening: money(opening),
        moneyIn: money(totalIn),
        moneyOut: money(totalOut),
        closing: money(opening.plus(totalIn).minus(totalOut)),
        entries,
      };
    });

    const sum = (pick: (row: (typeof items)[number]) => string) =>
      money(items.reduce((acc, row) => acc.plus(pick(row)), new Decimal(0)));

    return {
      items,
      meta: {
        kind,
        fromDate: query.fromDate,
        toDate: query.toDate,
        accountCount: items.length,
        opening: sum((r) => r.opening),
        moneyIn: sum((r) => r.moneyIn),
        moneyOut: sum((r) => r.moneyOut),
        closing: sum((r) => r.closing),
      },
    };
  }

  private emptyBookMeta(query: CashBookQueryDto) {
    return {
      kind: 'cash' as const,
      fromDate: query.fromDate,
      toDate: query.toDate,
      accountCount: 0,
      opening: '0.00',
      moneyIn: '0.00',
      moneyOut: '0.00',
      closing: '0.00',
    };
  }
}
