/**
 * Exact money arithmetic for amounts carried as decimal strings.
 *
 * The backend uses `decimal.js`; the browser needs the same answers without
 * pulling in a decimal library, so these work in **integer paise**. `0.1 + 0.2`
 * is 0.30000000000000004 in JS floats, which would make a voucher that balances
 * on paper refuse to submit.
 *
 * Safe to about ₹90,000 crore — well past any brick kiln's books.
 */

const PAISE_PER_RUPEE = 100;

/** `"1250.50"` → `125050`. Blank and malformed values read as zero. */
export function toPaise(amount: string | number | null | undefined): number {
  if (amount === null || amount === undefined || amount === '') return 0;

  const text = String(amount).trim();
  const match = /^(-?)(\d*)(?:\.(\d{0,2}))?\d*$/.exec(text);
  if (!match) return 0;

  const [, sign, rupees = '0', paise = ''] = match;
  const whole = Number(rupees || '0') * PAISE_PER_RUPEE;
  const fraction = Number(paise.padEnd(2, '0') || '0');
  const total = whole + fraction;

  return sign === '-' ? -total : total;
}

/** `125050` → `"1250.50"`. Always two decimal places, as the API expects. */
export function fromPaise(paise: number): string {
  const rounded = Math.round(paise);
  const sign = rounded < 0 ? '-' : '';
  const absolute = Math.abs(rounded);
  return `${sign}${Math.floor(absolute / PAISE_PER_RUPEE)}.${String(absolute % PAISE_PER_RUPEE).padStart(2, '0')}`;
}

/** Adds decimal-string amounts without floating-point drift. */
export function sumAmounts(amounts: Array<string | number | null | undefined>): string {
  return fromPaise(amounts.reduce<number>((total, amount) => total + toPaise(amount), 0));
}

export function subtractAmounts(a: string, b: string): string {
  return fromPaise(toPaise(a) - toPaise(b));
}

/** True when two decimal-string amounts are the same to the paisa. */
export function amountsEqual(a: string, b: string): boolean {
  return toPaise(a) === toPaise(b);
}

export function isZeroAmount(amount: string | null | undefined): boolean {
  return toPaise(amount) === 0;
}
