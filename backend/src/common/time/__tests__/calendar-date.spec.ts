import { toCalendarDate, todayCalendarDate } from '../calendar-date';

/**
 * Regression: a Postgres `date` column arrives as a JS `Date` at local
 * midnight, and `.toISOString().slice(0, 10)` converted it to UTC — so in IST
 * (+05:30) a voucher dated the 9th was reported as the 8th. The Day Book read
 * the entity (a string) and the Ledger statement read a raw query (a Date), so
 * the two disagreed about the same voucher.
 */
describe('toCalendarDate', () => {
  it('passes a string through, trimming any time part', () => {
    expect(toCalendarDate('2026-10-09')).toBe('2026-10-09');
    expect(toCalendarDate('2026-10-09T00:00:00.000Z')).toBe('2026-10-09');
  });

  it('reads a Date by its local calendar fields, not its UTC ones', () => {
    // Local midnight on the 9th. In any timezone east of Greenwich this is
    // still the 8th in UTC.
    const localMidnight = new Date(2026, 9, 9, 0, 0, 0);
    expect(toCalendarDate(localMidnight)).toBe('2026-10-09');
  });

  it('does not slip a day late in the evening either', () => {
    // 23:30 local on the 9th is already the 10th in UTC west of Greenwich.
    const lateEvening = new Date(2026, 9, 9, 23, 30, 0);
    expect(toCalendarDate(lateEvening)).toBe('2026-10-09');
  });

  it('pads single-digit months and days', () => {
    expect(toCalendarDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('todayCalendarDate', () => {
  it('uses the local calendar day', () => {
    // 00:30 local is the previous day in UTC at +05:30, which is when a
    // reversal posted just after midnight would have been misdated.
    expect(todayCalendarDate(new Date(2026, 9, 9, 0, 30, 0))).toBe('2026-10-09');
  });

  it('defaults to now', () => {
    expect(todayCalendarDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
