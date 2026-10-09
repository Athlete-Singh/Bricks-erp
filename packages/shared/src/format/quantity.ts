import { QUANTITY_SCALE } from '../constants/domain';

/**
 * Quantity arithmetic in integer thousandths.
 *
 * The same rule as money — never JS `number` math (CONVENTIONS) — but money
 * cannot be reused here: `toPaise` truncates at two decimals, so running a
 * quantity through it would silently drop the third. Stock is
 * `NUMERIC(18,3)`, because coal is weighed in tonnes while bricks are counted
 * in pieces.
 */
const SCALE_FACTOR = 10 ** QUANTITY_SCALE;

/** Parses a decimal string into integer thousandths, truncating beyond 3 places. */
export function toThousandths(quantity: string | number | null | undefined): number {
  if (quantity === null || quantity === undefined || quantity === '') return 0;

  const text = String(quantity).trim();
  const match = /^(-?)(\d*)(?:\.(\d{0,3}))?\d*$/.exec(text);
  if (!match) return 0;

  const [, sign, whole = '0', fraction = ''] = match;
  const units = Number(whole || '0');
  const thousandths = Number(fraction.padEnd(QUANTITY_SCALE, '0') || '0');
  const total = units * SCALE_FACTOR + thousandths;
  return sign === '-' ? -total : total;
}

/** Back to the decimal string the API speaks, e.g. `1250.500`. */
export function fromThousandths(value: number): string {
  const negative = value < 0;
  const absolute = Math.abs(Math.round(value));
  const units = Math.floor(absolute / SCALE_FACTOR);
  const fraction = String(absolute % SCALE_FACTOR).padStart(QUANTITY_SCALE, '0');
  return `${negative ? '-' : ''}${units}.${fraction}`;
}

export function sumQuantities(quantities: (string | null | undefined)[]): string {
  return fromThousandths(quantities.reduce<number>((total, q) => total + toThousandths(q), 0));
}

export function subtractQuantities(a: string, b: string): string {
  return fromThousandths(toThousandths(a) - toThousandths(b));
}

export function isZeroQuantity(quantity: string | null | undefined): boolean {
  return toThousandths(quantity) === 0;
}

/** True for a balance below zero, which only a deliberate adjustment can cause (ADR-026). */
export function isNegativeQuantity(quantity: string | null | undefined): boolean {
  return toThousandths(quantity) < 0;
}

const quantityFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: QUANTITY_SCALE });

/**
 * Indian digit grouping, trailing zeros dropped: `40000.000` reads as `40,000`
 * and `12.500` as `12.5`. Display only — never feed the result back into maths.
 */
export function formatQuantity(quantity: string | null | undefined): string {
  if (quantity === null || quantity === undefined || quantity === '') return '—';
  const thousandths = toThousandths(quantity);
  return quantityFormat.format(thousandths / SCALE_FACTOR);
}
