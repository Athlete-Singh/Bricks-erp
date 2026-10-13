/**
 * RPT-01 — one way to export every register as CSV. The viewer's CSP refuses
 * data: and blob: downloads from a plain link, so this builds the file into a
 * blob URL and clicks a dynamic anchor; the Blob is revoked after a tick.
 *
 * We write CSV rather than .xlsx (ADR-048 made the same call for GSTR-1):
 * CSV opens in Excel, in the CA's own tooling and in a text editor, and we
 * add no dependency whose output nobody can read without the app.
 */

function escape(cell: string | number | null | undefined): string {
  if (cell === null || cell === undefined) return '';
  const s = String(cell);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const lines = [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
