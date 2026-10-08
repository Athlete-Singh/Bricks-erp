import {
  LEDGER_GROUP_SEED,
  LEDGER_SEED,
  VOUCHER_TYPE_SEED,
  belongsToBalanceSheet,
  normalBalanceSide,
} from '@brics/shared';

/**
 * The seed is data, and a typo in it would quietly misfile money — a ledger
 * under the wrong group lands in the wrong half of the P&L. These assert the
 * shape of the chart itself, before any posting exists to exercise it.
 */
describe('chart of accounts seed', () => {
  const groupCodes = new Set(LEDGER_GROUP_SEED.map((g) => g.code));

  describe('groups', () => {
    it('has no duplicate codes', () => {
      expect(groupCodes.size).toBe(LEDGER_GROUP_SEED.length);
    });

    it('has no duplicate names — they are unique per company in the database', () => {
      const names = new Set(LEDGER_GROUP_SEED.map((g) => g.name));
      expect(names.size).toBe(LEDGER_GROUP_SEED.length);
    });

    it('only points at parents that exist', () => {
      const orphans = LEDGER_GROUP_SEED.filter((g) => g.parent !== null && !groupCodes.has(g.parent));
      expect(orphans).toEqual([]);
    });

    it('lists every parent before its children, so one pass can resolve ids', () => {
      const seen = new Set<string>();
      for (const group of LEDGER_GROUP_SEED) {
        if (group.parent) expect(seen.has(group.parent)).toBe(true);
        seen.add(group.code);
      }
    });

    it('gives a child the same nature as its parent', () => {
      // A liability cannot sit under an asset: the trial balance would not tie.
      const byCode = new Map(LEDGER_GROUP_SEED.map((g) => [g.code, g]));
      for (const group of LEDGER_GROUP_SEED) {
        if (!group.parent) continue;
        expect(byCode.get(group.parent)?.nature).toBe(group.nature);
      }
    });

    it('covers all four natures', () => {
      const natures = new Set(LEDGER_GROUP_SEED.map((g) => g.nature));
      expect([...natures].sort()).toEqual(['asset', 'expense', 'income', 'liability']);
    });

    it('marks exactly the trading-account groups as direct', () => {
      const direct = LEDGER_GROUP_SEED.filter((g) => g.isDirect)
        .map((g) => g.code)
        .sort();
      expect(direct).toEqual(['DIRECT_EXPENSES', 'DIRECT_INCOME', 'PURCHASE_ACCOUNTS', 'SALES_ACCOUNTS']);
    });

    it('has the groups ACCOUNTING_RULES names for party and tax accounts', () => {
      // Posting rules look these up by code; renaming one silently breaks them.
      for (const code of ['SUNDRY_DEBTORS', 'SUNDRY_CREDITORS', 'LABOUR_PAYABLES', 'DUTIES_TAXES', 'LABOUR_ADVANCES']) {
        expect(groupCodes.has(code)).toBe(true);
      }
    });
  });

  describe('ledgers', () => {
    it('has no duplicate codes or names', () => {
      expect(new Set(LEDGER_SEED.map((l) => l.code)).size).toBe(LEDGER_SEED.length);
      expect(new Set(LEDGER_SEED.map((l) => l.name)).size).toBe(LEDGER_SEED.length);
    });

    it('only sits in groups that exist', () => {
      const orphans = LEDGER_SEED.filter((l) => !groupCodes.has(l.group));
      expect(orphans).toEqual([]);
    });

    it('files every GST ledger under Duties & Taxes', () => {
      // The CGST/SGST vs IGST split in ACCOUNTING_RULES depends on this.
      const gst = LEDGER_SEED.filter((l) => /CGST|SGST|IGST/.test(l.code));
      expect(gst).toHaveLength(6);
      for (const ledger of gst) expect(ledger.group).toBe('DUTIES_TAXES');
    });

    it('carries the cost lines from the client cost-per-1,000 table', () => {
      // Proposal §4 / Functional Spec §22 — CST-01 reports against these.
      const direct = LEDGER_SEED.filter((l) => l.group === 'DIRECT_EXPENSES').map((l) => l.code);
      for (const code of ['LABOUR_WAGES', 'COAL', 'SOIL', 'ELECTRICITY', 'LOADING_UNLOADING']) {
        expect(direct).toContain(code);
      }
    });

    it('has somewhere for an unbalanced opening entry to park', () => {
      const difference = LEDGER_SEED.find((l) => l.code === 'OPENING_DIFFERENCE');
      expect(difference?.group).toBe('SUSPENSE');
    });

    it('has a cash ledger, which every manual receipt and payment needs', () => {
      expect(LEDGER_SEED.find((l) => l.code === 'CASH')?.group).toBe('CASH_IN_HAND');
    });
  });

  describe('voucher types', () => {
    it('seeds the eight types ACCOUNTING_RULES lists', () => {
      expect(VOUCHER_TYPE_SEED.map((v) => v.code).sort()).toEqual([
        'contra',
        'credit_note',
        'debit_note',
        'journal',
        'payment',
        'purchase',
        'receipt',
        'sales',
      ]);
    });

    it('gives each a distinct prefix, since it leads the voucher number', () => {
      const prefixes = VOUCHER_TYPE_SEED.map((v) => v.prefix);
      expect(new Set(prefixes).size).toBe(prefixes.length);
      expect(VOUCHER_TYPE_SEED.find((v) => v.code === 'sales')?.prefix).toBe('SAL');
    });
  });
});

describe('nature helpers', () => {
  it('puts assets and expenses on the debit side', () => {
    expect(normalBalanceSide('asset')).toBe('debit');
    expect(normalBalanceSide('expense')).toBe('debit');
  });

  it('puts liabilities and income on the credit side', () => {
    expect(normalBalanceSide('liability')).toBe('credit');
    expect(normalBalanceSide('income')).toBe('credit');
  });

  it('sends assets and liabilities to the balance sheet, the rest to the P&L', () => {
    expect(belongsToBalanceSheet('asset')).toBe(true);
    expect(belongsToBalanceSheet('liability')).toBe(true);
    expect(belongsToBalanceSheet('income')).toBe(false);
    expect(belongsToBalanceSheet('expense')).toBe(false);
  });
});
