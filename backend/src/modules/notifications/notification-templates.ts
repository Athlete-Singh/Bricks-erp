import { formatINR, formatQty, type NotificationEvent } from '@brics/shared';

/**
 * The words of each alert. Plain ASCII (`Rs.`, not `₹`): one Unicode
 * character turns an SMS into a UCS-2 message and halves what fits in it.
 *
 * MSG91 does not use this text — Indian SMS must match a DLT-registered
 * template, which MSG91 fills from `variables`. Register these exact
 * sentences with the variables in braces (docs/modules/notifications.md).
 */
export const TEMPLATES: Record<NotificationEvent, string> = {
  dispatch_sent: '{company}: Challan {challan} - {quantity} left our kiln on {date}. Thank you.',
  payment_received: '{company}: Received Rs. {amount} on {date}, receipt {receipt}. Thank you for your payment.',
  advance_alert: '{company}: Advance of Rs. {amount} to {sardar}. Unsecured advance exposure is now Rs. {exposure}.',
};

export function renderTemplate(event: NotificationEvent, variables: Record<string, string>): string {
  return TEMPLATES[event].replace(/\{(\w+)\}/g, (_, key: string) => variables[key] ?? '');
}

/** Money for an SMS: Indian grouping, no rupee sign (see above). */
export function smsMoney(amount: string | number): string {
  return formatINR(amount).replace('₹', '').trim();
}

export function smsQuantity(quantity: string | number): string {
  return formatQty(Number(quantity));
}

/** `2026-10-22` → `22 Oct 2026` — the way a customer reads a date. */
export function smsDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/**
 * An Indian mobile as the gateways want it — `91XXXXXXXXXX` — or null if the
 * number is not a mobile we can text. Party phones are free text, so this is
 * forgiving about spaces, dashes, `+91` and a leading `0`.
 */
export function normalizeIndianMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  const local =
    digits.length === 12 && digits.startsWith('91')
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith('0')
        ? digits.slice(1)
        : digits;
  return /^[6-9]\d{9}$/.test(local) ? `91${local}` : null;
}
