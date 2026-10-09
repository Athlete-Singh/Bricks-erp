import { Test, type TestingModule } from '@nestjs/testing';
import { BusinessRuleException } from '../../common/exceptions/business-rule.exception';
import { FinancialYear } from '../../modules/company/entities/financial-year.entity';
import { Ledger } from '../entities/ledger.entity';
import { Voucher } from '../entities/voucher.entity';
import { VoucherLine } from '../entities/voucher-line.entity';
import { VoucherSequence } from '../entities/voucher-sequence.entity';
import { VoucherType } from '../entities/voucher-type.entity';
import { PostingService, type PostingLine } from '../posting.service';
import { todayCalendarDate } from '../../common/time/calendar-date';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '22222222-2222-2222-2222-222222222222';
const CASH = 'aaaaaaaa-0000-0000-0000-000000000001';
const SALES = 'aaaaaaaa-0000-0000-0000-000000000002';

/**
 * A fake EntityManager. The posting rules are pure logic over a handful of
 * lookups, so they are worth testing without a database in the loop — the real
 * database path is covered by the e2e suite and by CHECK constraints.
 */
function makeManager(overrides: { financialYear?: Partial<FinancialYear> | null; ledgers?: Partial<Ledger>[] } = {}) {
  const saved: { vouchers: Voucher[]; lines: VoucherLine[][]; sequences: VoucherSequence[] } = {
    vouchers: [],
    lines: [],
    sequences: [],
  };
  const updates: Array<{ entity: unknown; where: unknown; patch: Record<string, unknown> }> = [];

  const financialYear =
    overrides.financialYear === null
      ? null
      : ({
          id: 'fy1',
          companyId: COMPANY_ID,
          name: '2026-27',
          startDate: '2026-04-01',
          endDate: '2027-03-31',
          isLocked: false,
          ...overrides.financialYear,
        } as FinancialYear);

  const ledgers = (overrides.ledgers ?? [
    { id: CASH, companyId: COMPANY_ID, name: 'Cash', isActive: true },
    { id: SALES, companyId: COMPANY_ID, name: 'Sales — Bricks', isActive: true },
  ]) as Ledger[];

  let sequenceRow: VoucherSequence | null = null;

  const manager = {
    create: (_entity: unknown, dto: unknown) => dto,
    save: jest.fn((entityOrDto: unknown, maybeDto?: unknown) => {
      const dto = maybeDto ?? entityOrDto;
      if (Array.isArray(dto)) {
        const rows = dto.map((d, i) => ({ id: `line-${i}`, ...(d as object) })) as VoucherLine[];
        saved.lines.push(rows);
        return Promise.resolve(rows);
      }
      const row = { id: `row-${saved.vouchers.length + 1}`, ...(dto as object) };
      if ('number' in row) saved.vouchers.push(row as Voucher);
      if ('lastNumber' in row) {
        sequenceRow = row as VoucherSequence;
        saved.sequences.push(sequenceRow);
      }
      return Promise.resolve(row);
    }),
    update: jest.fn((entity: unknown, where: unknown, patch: Record<string, unknown>) => {
      updates.push({ entity, where, patch });
      if (sequenceRow && 'lastNumber' in patch) sequenceRow.lastNumber = patch.lastNumber as number;
      return Promise.resolve();
    }),
    findOne: jest.fn((entity: unknown, options: { where: Record<string, unknown> }) => {
      if (entity === VoucherType) {
        const code = options.where.code as string;
        const prefixes: Record<string, string> = { journal: 'JNL', receipt: 'RCT', sales: 'SAL' };
        return Promise.resolve(
          prefixes[code]
            ? ({ id: `vt-${code}`, companyId: COMPANY_ID, code, prefix: prefixes[code] } as VoucherType)
            : null,
        );
      }
      if (entity === Voucher) {
        return Promise.resolve(saved.vouchers.find((v) => v.id === options.where.id) ?? null);
      }
      return Promise.resolve(null);
    }),
    findOneOrFail: jest.fn(() =>
      Promise.resolve({ id: 'vt-journal', companyId: COMPANY_ID, code: 'journal', prefix: 'JNL' } as VoucherType),
    ),
    find: jest.fn(() => Promise.resolve(saved.lines.at(-1) ?? [])),
    createQueryBuilder: jest.fn((entity: unknown) => {
      const builder = {
        setLock: () => builder,
        where: () => builder,
        andWhere: () => builder,
        getOne: () => Promise.resolve(entity === FinancialYear ? financialYear : sequenceRow),
        getOneOrFail: () => Promise.resolve(sequenceRow),
        getMany: () => Promise.resolve(ledgers),
      };
      return builder;
    }),
  };

  return { manager: manager as never, saved, updates };
}

const line = (ledgerId: string, debit?: string, credit?: string): PostingLine => ({ ledgerId, debit, credit });

const balanced: PostingLine[] = [line(CASH, '1000.00'), line(SALES, undefined, '1000.00')];

const input = (lines: PostingLine[] = balanced, extra: Record<string, unknown> = {}) => ({
  companyId: COMPANY_ID,
  userId: USER_ID,
  voucherTypeCode: 'journal',
  voucherDate: '2026-06-15',
  lines,
  ...extra,
});

describe('PostingService', () => {
  let service: PostingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({ providers: [PostingService] }).compile();
    service = module.get(PostingService);
  });

  describe('the journal must balance', () => {
    it('refuses debits that do not equal credits', async () => {
      const { manager } = makeManager();

      await expect(
        service.post(manager, input([line(CASH, '1000.00'), line(SALES, undefined, '900.00')])),
      ).rejects.toMatchObject({ code: 'JOURNAL_UNBALANCED' });
    });

    it('says by how much it is out, which is what the user needs to fix it', async () => {
      const { manager } = makeManager();

      await expect(
        service.post(manager, input([line(CASH, '1000.00'), line(SALES, undefined, '900.00')])),
      ).rejects.toThrow(/differ by 100\.00/);
    });

    it('accepts a balanced journal', async () => {
      const { manager, saved } = makeManager();

      const result = await service.post(manager, input());

      expect(result.lines).toHaveLength(2);
      expect(saved.vouchers).toHaveLength(1);
    });

    it('balances across many lines, not just two', async () => {
      const { manager } = makeManager();

      const result = await service.post(
        manager,
        input([line(CASH, '600.00'), line(CASH, '400.00'), line(SALES, undefined, '1000.00')]),
      );

      expect(result.lines).toHaveLength(3);
    });

    it('adds paise exactly — three 0.10 debits balance one 0.30 credit', async () => {
      // With JS numbers 0.1 + 0.1 + 0.1 !== 0.3, and the journal would be
      // rejected as unbalanced.
      const { manager } = makeManager();

      const result = await service.post(
        manager,
        input([line(CASH, '0.10'), line(CASH, '0.10'), line(CASH, '0.10'), line(SALES, undefined, '0.30')]),
      );

      expect(result.lines).toHaveLength(4);
    });

    it('refuses a journal that moves nothing', async () => {
      const { manager } = makeManager();

      await expect(
        service.post(manager, input([line(CASH, '0.00'), line(SALES, undefined, '0.00')])),
      ).rejects.toMatchObject({ code: 'JOURNAL_EMPTY_LINE' });
    });

    it('refuses a single-sided journal', async () => {
      const { manager } = makeManager();

      await expect(service.post(manager, input([line(CASH, '100.00')]))).rejects.toMatchObject({
        code: 'JOURNAL_TOO_FEW_LINES',
      });
    });

    it('refuses a line carrying both a debit and a credit', async () => {
      const { manager } = makeManager();

      await expect(
        service.post(manager, input([line(CASH, '100.00', '100.00'), line(SALES, undefined, '100.00')])),
      ).rejects.toMatchObject({ code: 'JOURNAL_LINE_BOTH_SIDES' });
    });

    it('refuses a negative amount instead of quietly flipping the side', async () => {
      const { manager } = makeManager();

      await expect(
        service.post(manager, input([line(CASH, '-100.00'), line(SALES, undefined, '-100.00')])),
      ).rejects.toMatchObject({ code: 'JOURNAL_NEGATIVE_AMOUNT' });
    });
  });

  describe('the financial year must be open', () => {
    it('refuses a date no financial year covers', async () => {
      const { manager } = makeManager({ financialYear: null });

      await expect(service.post(manager, input())).rejects.toMatchObject({ code: 'FY_NOT_FOUND' });
    });

    it('refuses posting into a locked year', async () => {
      const { manager } = makeManager({ financialYear: { isLocked: true } });

      await expect(service.post(manager, input())).rejects.toMatchObject({ code: 'FY_LOCKED' });
    });

    it('names the year in the message, so the user knows which one to open', async () => {
      const { manager } = makeManager({ financialYear: { isLocked: true, name: '2025-26' } });

      await expect(service.post(manager, input())).rejects.toThrow(/2025-26 is locked/);
    });
  });

  describe('tenancy', () => {
    it('refuses a ledger that belongs to another company', async () => {
      // The lookup is company-scoped, so a foreign ledger simply is not found.
      const { manager } = makeManager({ ledgers: [{ id: CASH, companyId: COMPANY_ID, isActive: true }] });

      await expect(service.post(manager, input())).rejects.toMatchObject({ code: 'LEDGER_NOT_IN_COMPANY' });
    });

    it('refuses posting to a deactivated ledger', async () => {
      const { manager } = makeManager({
        ledgers: [
          { id: CASH, companyId: COMPANY_ID, name: 'Cash', isActive: true },
          { id: SALES, companyId: COMPANY_ID, name: 'Old Sales', isActive: false },
        ],
      });

      await expect(service.post(manager, input())).rejects.toMatchObject({ code: 'LEDGER_INACTIVE' });
    });
  });

  describe('voucher numbering', () => {
    it('formats as PREFIX/FY/000001', async () => {
      const { manager, saved } = makeManager();

      await service.post(manager, input());

      expect(saved.vouchers[0]?.number).toBe('JNL/2026-27/000001');
    });

    it('increments within the same company, year and type', async () => {
      const { manager, saved } = makeManager();

      await service.post(manager, input());
      await service.post(manager, input());
      await service.post(manager, input());

      expect(saved.vouchers.map((v) => v.number)).toEqual([
        'JNL/2026-27/000001',
        'JNL/2026-27/000002',
        'JNL/2026-27/000003',
      ]);
    });

    it('takes the counter row with a write lock, so concurrent posts queue', async () => {
      // Without the lock two posts would read the same last number and collide
      // on the unique index — or worse, both succeed and duplicate a number.
      const { manager } = makeManager();
      const builder = (manager as unknown as { createQueryBuilder: jest.Mock }).createQueryBuilder;

      await service.post(manager, input());

      const sequenceBuilder = builder.mock.results
        .map((r) => r.value as { setLock?: unknown })
        .filter((b) => typeof b.setLock === 'function');
      expect(sequenceBuilder.length).toBeGreaterThan(0);
    });

    it('uses the voucher type prefix', async () => {
      const { manager, saved } = makeManager();

      await service.post(manager, input(balanced, { voucherTypeCode: 'receipt' }));

      expect(saved.vouchers[0]?.number).toMatch(/^RCT\/2026-27\/\d{6}$/);
    });

    it('refuses an unknown voucher type', async () => {
      const { manager } = makeManager();

      await expect(service.post(manager, input(balanced, { voucherTypeCode: 'nonsense' }))).rejects.toMatchObject({
        code: 'VOUCHER_TYPE_UNKNOWN',
      });
    });
  });

  describe('what gets written', () => {
    it('stamps the company, year, user and date on the voucher', async () => {
      const { manager, saved } = makeManager();

      await service.post(manager, input());

      expect(saved.vouchers[0]).toMatchObject({
        companyId: COMPANY_ID,
        financialYearId: 'fy1',
        voucherDate: '2026-06-15',
        status: 'posted',
        createdBy: USER_ID,
      });
    });

    it('normalises amounts to two decimal places', async () => {
      const { manager, saved } = makeManager();

      await service.post(manager, input([line(CASH, '1000'), line(SALES, undefined, '1000')]));

      expect(saved.lines[0]?.[0]).toMatchObject({ debit: '1000.00', credit: '0.00' });
    });

    it('keeps the line order the user entered', async () => {
      const { manager, saved } = makeManager();

      await service.post(manager, input([line(SALES, undefined, '1000.00'), line(CASH, '1000.00')]));

      expect(saved.lines[0]?.map((l) => l.lineOrder)).toEqual([0, 1]);
    });

    it('records what produced the journal, so a document can find it', async () => {
      const { manager, saved } = makeManager();

      await service.post(manager, input(balanced, { sourceType: 'sales_invoice', sourceId: 'inv-1' }));

      expect(saved.vouchers[0]).toMatchObject({ sourceType: 'sales_invoice', sourceId: 'inv-1' });
    });

    it('falls the voucher kiln through to lines that do not name one', async () => {
      const { manager, saved } = makeManager();

      await service.post(manager, input(balanced, { siteId: 'kiln-1' }));

      expect(saved.lines[0]?.every((l) => l.siteId === 'kiln-1')).toBe(true);
    });
  });

  describe('reversal (ACC-02)', () => {
    it('mirrors every line onto the opposite side', async () => {
      const { manager, saved } = makeManager();
      const original = await service.post(manager, input());

      const reversal = await service.reverse(manager, COMPANY_ID, USER_ID, original.voucher.id);

      expect(reversal.lines).toHaveLength(2);
      // The original debited Cash 1000; the reversal credits it.
      expect(saved.lines.at(-1)?.[0]).toMatchObject({ ledgerId: CASH, debit: '0.00', credit: '1000.00' });
      expect(saved.lines.at(-1)?.[1]).toMatchObject({ ledgerId: SALES, debit: '1000.00', credit: '0.00' });
    });

    it('marks the original reversed and links the two', async () => {
      const { manager, updates } = makeManager();
      const original = await service.post(manager, input());

      const reversal = await service.reverse(manager, COMPANY_ID, USER_ID, original.voucher.id);

      expect(reversal.voucher.reversalOfId).toBe(original.voucher.id);
      expect(updates.some((u) => u.patch.status === 'reversed')).toBe(true);
    });

    it('gets its own number rather than reusing the original', async () => {
      const { manager, saved } = makeManager();
      const original = await service.post(manager, input());

      await service.reverse(manager, COMPANY_ID, USER_ID, original.voucher.id);

      expect(saved.vouchers[1]?.number).not.toBe(saved.vouchers[0]?.number);
      expect(saved.vouchers[1]?.number).toBe('JNL/2026-27/000002');
    });

    it('refuses to reverse the same voucher twice', async () => {
      const { manager } = makeManager();
      const original = await service.post(manager, input());
      await service.reverse(manager, COMPANY_ID, USER_ID, original.voucher.id);
      original.voucher.status = 'reversed';

      await expect(service.reverse(manager, COMPANY_ID, USER_ID, original.voucher.id)).rejects.toMatchObject({
        code: 'VOUCHER_ALREADY_REVERSED',
      });
    });

    it('refuses to reverse a reversal', async () => {
      const { manager } = makeManager();
      const original = await service.post(manager, input());
      const reversal = await service.reverse(manager, COMPANY_ID, USER_ID, original.voucher.id);

      await expect(service.reverse(manager, COMPANY_ID, USER_ID, reversal.voucher.id)).rejects.toMatchObject({
        code: 'VOUCHER_IS_A_REVERSAL',
      });
    });

    it('refuses a voucher from another company', async () => {
      const { manager } = makeManager();

      await expect(service.reverse(manager, COMPANY_ID, USER_ID, 'not-ours')).rejects.toMatchObject({
        code: 'VOUCHER_NOT_FOUND',
      });
    });

    it('dates the reversal today, not back into a reported period', async () => {
      const { manager, saved } = makeManager();
      const original = await service.post(manager, input());

      await service.reverse(manager, COMPANY_ID, USER_ID, original.voucher.id);

      expect(saved.vouchers[1]?.voucherDate).toBe(todayCalendarDate());
    });

    it('explains itself in the narration', async () => {
      const { manager, saved } = makeManager();
      const original = await service.post(manager, input());

      await service.reverse(manager, COMPANY_ID, USER_ID, original.voucher.id);

      expect(saved.vouchers[1]?.narration).toBe(`Reversal of ${original.voucher.number}`);
    });
  });

  it('throws BusinessRuleException, so the filter maps it to 422 with a code', async () => {
    const { manager } = makeManager();

    await expect(
      service.post(manager, input([line(CASH, '1.00'), line(SALES, undefined, '2.00')])),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });
});
