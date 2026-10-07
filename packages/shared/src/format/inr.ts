const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const qty = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/**
 * Formats a money value in Indian style: ₹1,00,000.00.
 * Accepts the decimal string the API sends. Display only; never use the result for maths.
 */
export function formatINR(amount: string | number): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(value)) return '—';
  return inr.format(value);
}

/** Formats an integer brick quantity with Indian digit grouping: 1,25,000. */
export function formatQty(quantity: number): string {
  return qty.format(quantity);
}
