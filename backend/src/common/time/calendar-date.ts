/**
 * Calendar dates, kept free of timezone drift.
 *
 * A Postgres `date` column has no time and no zone, but `pg` hands it back as a
 * JS `Date` at **local midnight**. Calling `.toISOString()` on that converts to
 * UTC and moves it to the previous day anywhere east of Greenwich — in IST
 * (+05:30) a voucher dated the 9th read back as the 8th, which would file
 * entries into the wrong period and make a month-end report wrong.
 *
 * These read the local calendar fields instead, which is what a `date` means.
 */

function formatLocal(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Normalises whatever the driver returned for a `date` column to `YYYY-MM-DD`. */
export function toCalendarDate(value: string | Date): string {
  return value instanceof Date ? formatLocal(value) : String(value).slice(0, 10);
}

/** Today in the server's own timezone — not UTC. */
export function todayCalendarDate(now: Date = new Date()): string {
  return formatLocal(now);
}
