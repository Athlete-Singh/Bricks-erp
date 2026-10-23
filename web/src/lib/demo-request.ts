/**
 * The home page's "Book a Demo" form. One validator for the browser and the
 * route handler, so both refuse the same things.
 */

export interface DemoRequest {
  name: string;
  mobile: string;
  kilnName: string;
  location: string;
  kilnCount: number;
}

export type DemoField = keyof DemoRequest;
export type DemoErrors = Partial<Record<DemoField, string>>;

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Indian mobile: 10 digits starting 6–9, with an optional +91 / 0 in front. */
export function normaliseMobile(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export function validateDemoRequest(
  input: Record<string, unknown>,
): { ok: true; data: DemoRequest } | { ok: false; errors: DemoErrors } {
  const errors: DemoErrors = {};
  const name = text(input.name);
  const kilnName = text(input.kilnName);
  const location = text(input.location);
  const mobile = normaliseMobile(text(input.mobile));
  const kilnCount = Number(text(String(input.kilnCount ?? '')));

  if (name.length < 2) errors.name = 'Please enter your name.';
  else if (name.length > 80) errors.name = 'Name is too long.';
  if (!mobile) errors.mobile = 'Enter a 10-digit mobile number.';
  if (kilnName.length < 2) errors.kilnName = 'Please enter your kiln name.';
  else if (kilnName.length > 120) errors.kilnName = 'Kiln name is too long.';
  if (location.length < 2) errors.location = 'Please enter your town or district.';
  else if (location.length > 120) errors.location = 'Location is too long.';
  if (!Number.isInteger(kilnCount) || kilnCount < 1 || kilnCount > 50)
    errors.kilnCount = 'Enter a number from 1 to 50.';

  if (Object.keys(errors).length > 0 || !mobile) return { ok: false, errors };
  return { ok: true, data: { name, mobile, kilnName, location, kilnCount } };
}
