import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { EntityManager } from 'typeorm';
import { BusinessRuleException } from '../common/exceptions/business-rule.exception';
import { Money } from '../common/money/money';
import { FinancialYear } from '../modules/company/entities/financial-year.entity';
import { Ledger } from './entities/ledger.entity';
import { Voucher } from './entities/voucher.entity';
import { VoucherLine } from './entities/voucher-line.entity';
import { VoucherSequence } from './entities/voucher-sequence.entity';
import { VoucherType } from './entities/voucher-type.entity';

/** One leg of the journal, as a caller describes it. */
export interface PostingLine {
  ledgerId: string;
  /** Decimal strings. Exactly one of the two is greater than zero. */
  debit?: string;
  credit?: string;
  partyId?: string | null;
  siteId?: string | null;
  narration?: string | null;
}

export interface PostingInput {
  companyId: string;
  userId: string;
  /** Voucher type **code** — `receipt`, `sales`, … — not its id. */
  voucherTypeCode: string;
  /** `YYYY-MM-DD`. Must fall inside an open financial year. */
  voucherDate: string;
  lines: PostingLine[];
  narration?: string | null;
  siteId?: string | null;
  /** What produced this journal, e.g. `sales_invoice` + the invoice id. */
  sourceType?: string | null;
  sourceId?: string | null;
}

export interface PostedVoucher {
  voucher: Voucher;
  lines: VoucherLine[];
}

/**
 * The only way a journal is ever written (ACC-02).
 *
 * Everything takes an `EntityManager` from the caller rather than opening its
 * own transaction: the core principle of BRICS is that an operation recorded at
 * the kiln creates the stock movement **and** the balanced journal in one
 * database transaction. If this service committed separately, a crash between
 * the two would leave stock that no entry explains.
 */
@Injectable()
export class PostingService {
  async post(manager: EntityManager, input: PostingInput): Promise<PostedVoucher> {
    const lines = this.validateLines(input.lines);
    const voucherType = await this.requireVoucherType(manager, input.companyId, input.voucherTypeCode);
    const financialYear = await this.requireOpenFinancialYear(manager, input.companyId, input.voucherDate);
    await this.assertLedgersBelongToCompany(manager, input.companyId, lines);

    const number = await this.nextVoucherNumber(manager, input.companyId, financialYear, voucherType);

    const voucher = await manager.save(
      manager.create(Voucher, {
        companyId: input.companyId,
        voucherTypeId: voucherType.id,
        financialYearId: financialYear.id,
        number,
        voucherDate: input.voucherDate,
        status: 'posted',
        narration: input.narration ?? null,
        siteId: input.siteId ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        createdBy: input.userId,
        updatedBy: input.userId,
      }),
    );

    const savedLines = await manager.save(
      lines.map((line, index) =>
        manager.create(VoucherLine, {
          companyId: input.companyId,
          voucherId: voucher.id,
          ledgerId: line.ledgerId,
          debit: Money.toString(line.debit ?? 0),
          credit: Money.toString(line.credit ?? 0),
          partyId: line.partyId ?? null,
          siteId: line.siteId ?? input.siteId ?? null,
          narration: line.narration ?? null,
          lineOrder: index,
          createdBy: input.userId,
          updatedBy: input.userId,
        }),
      ),
    );

    return { voucher, lines: savedLines };
  }

  /**
   * Cancels a posted voucher by writing its mirror (ACC-02). A posted voucher is
   * never edited or deleted — the original and the reversal both stay in the
   * books, which is what makes the trail auditable.
   */
  async reverse(
    manager: EntityManager,
    companyId: string,
    userId: string,
    voucherId: string,
    options: { voucherDate?: string; narration?: string } = {},
  ): Promise<PostedVoucher> {
    const original = await manager.findOne(Voucher, { where: { id: voucherId, companyId } });
    if (!original) {
      throw new BusinessRuleException('VOUCHER_NOT_FOUND', 'Voucher not found');
    }
    if (original.status === 'reversed') {
      throw new BusinessRuleException('VOUCHER_ALREADY_REVERSED', `Voucher ${original.number} is already reversed`);
    }
    if (original.reversalOfId) {
      throw new BusinessRuleException(
        'VOUCHER_IS_A_REVERSAL',
        `Voucher ${original.number} is itself a reversal and cannot be reversed again`,
      );
    }

    const originalLines = await manager.find(VoucherLine, {
      where: { voucherId: original.id },
      order: { lineOrder: 'ASC' },
    });
    const voucherType = await manager.findOneOrFail(VoucherType, { where: { id: original.voucherTypeId } });

    // Debits become credits and vice versa — same amounts, opposite sides.
    const mirrored: PostingLine[] = originalLines.map((line) => ({
      ledgerId: line.ledgerId,
      debit: line.credit,
      credit: line.debit,
      partyId: line.partyId,
      siteId: line.siteId,
      narration: line.narration,
    }));

    const reversal = await this.post(manager, {
      companyId,
      userId,
      voucherTypeCode: voucherType.code,
      // Defaults to today, not the original date: reversing into a period that
      // has been reported would change figures already given to the client.
      voucherDate: options.voucherDate ?? new Date().toISOString().slice(0, 10),
      lines: mirrored,
      narration: options.narration ?? `Reversal of ${original.number}`,
      siteId: original.siteId,
      sourceType: original.sourceType,
      sourceId: original.sourceId,
    });

    await manager.update(Voucher, { id: reversal.voucher.id }, { reversalOfId: original.id });
    await manager.update(Voucher, { id: original.id }, { status: 'reversed', updatedBy: userId });
    reversal.voucher.reversalOfId = original.id;

    return reversal;
  }

  // ── validation ─────────────────────────────────────────────────────────────

  /**
   * The rule the whole system rests on: debits equal credits, and the journal
   * actually moves money.
   */
  private validateLines(lines: PostingLine[]): PostingLine[] {
    if (lines.length < 2) {
      throw new BusinessRuleException(
        'JOURNAL_TOO_FEW_LINES',
        'A journal needs at least two lines — one to debit and one to credit',
      );
    }

    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    for (const [index, line] of lines.entries()) {
      const debit = Money.of(line.debit ?? 0);
      const credit = Money.of(line.credit ?? 0);

      if (debit.isNegative() || credit.isNegative()) {
        throw new BusinessRuleException(
          'JOURNAL_NEGATIVE_AMOUNT',
          `Line ${index + 1}: amounts cannot be negative — put it on the other side instead`,
        );
      }
      if (debit.isZero() && credit.isZero()) {
        throw new BusinessRuleException('JOURNAL_EMPTY_LINE', `Line ${index + 1}: enter a debit or a credit`);
      }
      if (debit.greaterThan(0) && credit.greaterThan(0)) {
        throw new BusinessRuleException(
          'JOURNAL_LINE_BOTH_SIDES',
          `Line ${index + 1}: a line is a debit or a credit, not both`,
        );
      }

      totalDebit = totalDebit.plus(debit);
      totalCredit = totalCredit.plus(credit);
    }

    if (totalDebit.isZero()) {
      throw new BusinessRuleException('JOURNAL_ZERO_VALUE', 'A journal must move a non-zero amount');
    }
    if (!totalDebit.equals(totalCredit)) {
      const difference = totalDebit.minus(totalCredit).abs();
      throw new BusinessRuleException(
        'JOURNAL_UNBALANCED',
        `Debits (${Money.toString(totalDebit)}) and credits (${Money.toString(totalCredit)}) differ by ${Money.toString(difference)}`,
        { totalDebit: Money.toString(totalDebit), totalCredit: Money.toString(totalCredit) },
      );
    }

    return lines;
  }

  private async requireVoucherType(manager: EntityManager, companyId: string, code: string): Promise<VoucherType> {
    const voucherType = await manager.findOne(VoucherType, { where: { companyId, code } });
    if (!voucherType) {
      throw new BusinessRuleException('VOUCHER_TYPE_UNKNOWN', `Voucher type '${code}' does not exist`);
    }
    return voucherType;
  }

  /** The FY lock: nothing may be posted into a year that has been closed. */
  private async requireOpenFinancialYear(
    manager: EntityManager,
    companyId: string,
    voucherDate: string,
  ): Promise<FinancialYear> {
    const financialYear = await manager
      .createQueryBuilder(FinancialYear, 'fy')
      .where('fy.company_id = :companyId', { companyId })
      .andWhere('fy.start_date <= :date AND fy.end_date >= :date', { date: voucherDate })
      .getOne();

    if (!financialYear) {
      throw new BusinessRuleException(
        'FY_NOT_FOUND',
        `No financial year covers ${voucherDate}. Create one before posting into that period.`,
      );
    }
    if (financialYear.isLocked) {
      throw new BusinessRuleException(
        'FY_LOCKED',
        `Financial year ${financialYear.name} is locked. Post into an open year, or reverse instead of editing.`,
      );
    }
    return financialYear;
  }

  /** A journal may only touch ledgers of its own company (AGENTS rule 5). */
  private async assertLedgersBelongToCompany(
    manager: EntityManager,
    companyId: string,
    lines: PostingLine[],
  ): Promise<void> {
    const ledgerIds = [...new Set(lines.map((l) => l.ledgerId))];
    const found = await manager
      .createQueryBuilder(Ledger, 'l')
      .where('l.company_id = :companyId', { companyId })
      .andWhere('l.id IN (:...ledgerIds)', { ledgerIds })
      .getMany();

    if (found.length !== ledgerIds.length) {
      const known = new Set(found.map((l) => l.id));
      const missing = ledgerIds.filter((id) => !known.has(id));
      throw new BusinessRuleException(
        'LEDGER_NOT_IN_COMPANY',
        `${missing.length} ledger(s) do not belong to this company`,
      );
    }

    const inactive = found.filter((l) => !l.isActive);
    if (inactive.length > 0) {
      throw new BusinessRuleException(
        'LEDGER_INACTIVE',
        `Cannot post to inactive ledger(s): ${inactive.map((l) => l.name).join(', ')}`,
      );
    }
  }

  // ── numbering ──────────────────────────────────────────────────────────────

  /**
   * `JNL/2026-27/000001`, gapless per company + FY + type.
   *
   * The counter row is taken with `FOR UPDATE`, so two concurrent posts queue
   * rather than both reading the same number. Because the lock is held to the
   * end of the caller's transaction, a rollback also rolls the counter back —
   * which is exactly what gapless numbering requires.
   */
  private async nextVoucherNumber(
    manager: EntityManager,
    companyId: string,
    financialYear: FinancialYear,
    voucherType: VoucherType,
  ): Promise<string> {
    const scope = {
      companyId,
      financialYearId: financialYear.id,
      voucherTypeId: voucherType.id,
    };

    let sequence = await manager
      .createQueryBuilder(VoucherSequence, 'seq')
      .setLock('pessimistic_write')
      .where('seq.company_id = :companyId', scope)
      .andWhere('seq.financial_year_id = :financialYearId', scope)
      .andWhere('seq.voucher_type_id = :voucherTypeId', scope)
      .getOne();

    if (!sequence) {
      // First voucher of this type in this year. A concurrent insert would hit
      // the unique index, so fall back to re-reading the row the winner wrote.
      try {
        sequence = await manager.save(manager.create(VoucherSequence, { ...scope, lastNumber: 0 }));
      } catch {
        sequence = await manager
          .createQueryBuilder(VoucherSequence, 'seq')
          .setLock('pessimistic_write')
          .where('seq.company_id = :companyId', scope)
          .andWhere('seq.financial_year_id = :financialYearId', scope)
          .andWhere('seq.voucher_type_id = :voucherTypeId', scope)
          .getOneOrFail();
      }
    }

    const next = sequence.lastNumber + 1;
    await manager.update(VoucherSequence, { id: sequence.id }, { lastNumber: next });

    const yearLabel = financialYear.name.replace(/[/\s]/g, '-');
    return `${voucherType.prefix}/${yearLabel}/${String(next).padStart(6, '0')}`;
  }
}
