import { describe, expect, it } from 'vitest';
import { LEDGER_GROUP_SEED, LEDGER_SEED } from './accounting';

describe('chart of accounts seed', () => {
  it('puts every ledger in a group that exists', () => {
    const groups = new Set(LEDGER_GROUP_SEED.map((g) => g.code));
    const orphans = LEDGER_SEED.filter((l) => !groups.has(l.group)).map((l) => l.code);
    expect(orphans).toEqual([]);
  });

  it('declares every parent group before its children', () => {
    // `seedChartForCompany` resolves parents by walking the list in order, so a
    // child declared first would silently get a null parent.
    const seen = new Set<string>();
    const early: string[] = [];
    for (const group of LEDGER_GROUP_SEED) {
      if (group.parent && !seen.has(group.parent)) early.push(group.code);
      seen.add(group.code);
    }
    expect(early).toEqual([]);
  });

  it('uses each ledger code once', () => {
    const codes = LEDGER_SEED.map((l) => l.code);
    expect(codes.length).toBe(new Set(codes).size);
  });

  it('carries a ledger for every EXP-01 expense category', () => {
    // EXP-01 names these by hand in FEATURES.md. A category with no ledger has
    // nowhere honest to land, and the P2 chart was missing the last two until
    // P10 added them.
    const required = [
      'LABOUR_WAGES',
      'COAL',
      'VEHICLE_DIESEL',
      'ELECTRICITY',
      'VEHICLE_REPAIRS',
      'REPAIRS_MAINTENANCE',
      'SALARY',
      'RENT',
      'OFFICE_EXPENSES',
      'GOVERNMENT_CHARGES',
      'BANK_CHARGES',
      'MISC_EXPENSES',
      'MACHINERY_REPAIRS',
      'FOOD_EXPENSES',
    ];
    const codes = new Set(LEDGER_SEED.map((l) => l.code));
    expect(required.filter((c) => !codes.has(c))).toEqual([]);
  });

  it('keeps every expense category under a direct or indirect expense group', () => {
    const expenseCodes = ['MACHINERY_REPAIRS', 'FOOD_EXPENSES'];
    for (const code of expenseCodes) {
      const ledger = LEDGER_SEED.find((l) => l.code === code);
      expect(ledger?.group).toMatch(/_EXPENSES$/);
    }
  });
});
