import { describe, expect, it } from 'vitest';
import { financialYearLabel, formatDate, todayISO } from './date';
import { formatINR, formatQty } from './inr';

describe('formatINR', () => {
  it('uses Indian digit grouping with two decimals', () => {
    expect(formatINR('100000')).toBe('₹1,00,000.00');
    expect(formatINR('12500000.5')).toBe('₹1,25,00,000.50');
  });
  it('shows a dash for invalid input', () => {
    expect(formatINR('abc')).toBe('—');
  });
});

describe('formatQty', () => {
  it('groups brick quantities the Indian way', () => {
    expect(formatQty(125000)).toBe('1,25,000');
  });
});

describe('dates', () => {
  it('formats ISO dates as DD-MM-YYYY', () => {
    expect(formatDate('2026-10-07')).toBe('07-10-2026');
  });
  it('labels the April–March financial year', () => {
    expect(financialYearLabel(new Date(2026, 9, 7))).toBe('2026-27');
    expect(financialYearLabel(new Date(2027, 2, 31))).toBe('2026-27');
    expect(financialYearLabel(new Date(2027, 3, 1))).toBe('2027-28');
  });
});

describe('todayISO', () => {
  it('reads the local calendar day, not the UTC one', () => {
    // 00:30 local is still the previous day in UTC at +05:30 — which is when a
    // morning entry would otherwise be dated a day early.
    expect(todayISO(new Date(2026, 9, 9, 0, 30, 0))).toBe('2026-10-09');
  });

  it('does not slip forward late in the evening either', () => {
    expect(todayISO(new Date(2026, 9, 9, 23, 30, 0))).toBe('2026-10-09');
  });

  it('pads single-digit months and days', () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('defaults to now', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
