/** Formats an ISO date (YYYY-MM-DD or full ISO) as DD-MM-YYYY. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}-${m}-${y}` : '—';
}

/**
 * Indian financial year label for a date, e.g. 2026-10-07 → "2026-27".
 * @param startMonth month the FY starts (1-12), April by default.
 */
export function financialYearLabel(date: Date, startMonth = 4): string {
  const year = date.getFullYear();
  const start = date.getMonth() + 1 >= startMonth ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}
