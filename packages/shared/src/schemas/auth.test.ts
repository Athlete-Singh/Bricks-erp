import { describe, expect, it } from 'vitest';
import {
  createCompanySchema,
  createSiteSchema,
  createUserSchema,
  createVoucherSchema,
  openingBalanceSchema,
  updateCompanySchema,
  updateUserSchema,
} from './auth';

/**
 * Regression: optional fields used `z.string().email().optional().nullable()`,
 * which rejects `""`. A form that leaves an optional input blank submits an
 * empty string, so clearing an optional field failed validation instead of
 * clearing the value. Blank must normalise to `null`.
 */
describe('optional fields accept a blank value', () => {
  it('treats a blank email as "no email", not an invalid one', () => {
    const result = createUserSchema.safeParse({
      email: '',
      mobile: '9000000000',
      name: 'Ramesh',
      password: 'secret123',
      roleCode: 'supervisor',
    });

    expect(result.success).toBe(true);
    expect(result.data?.email).toBeNull();
  });

  it('still rejects an email that is present but malformed', () => {
    const result = createUserSchema.safeParse({
      email: 'not-an-email',
      mobile: '9000000000',
      name: 'Ramesh',
      password: 'secret123',
      roleCode: 'supervisor',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['email']);
  });

  it('keeps a valid email', () => {
    const result = createUserSchema.safeParse({
      email: 'ramesh@kiln.test',
      mobile: '9000000000',
      name: 'Ramesh',
      password: 'secret123',
      roleCode: 'supervisor',
    });

    expect(result.data?.email).toBe('ramesh@kiln.test');
  });

  it('lets an owner clear GSTIN, PAN, address and logo on the company form', () => {
    const result = updateCompanySchema.safeParse({
      name: 'Shri Ram Bricks',
      stateCode: '09',
      gstin: '',
      pan: '',
      address: '',
      logoUrl: '',
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ gstin: null, pan: null, address: null, logoUrl: null });
  });

  it('still enforces the GSTIN length when one is given', () => {
    const result = updateCompanySchema.safeParse({ gstin: 'TOO-SHORT' });
    expect(result.success).toBe(false);
  });

  it('accepts a company with no optional fields at all', () => {
    const result = createCompanySchema.safeParse({ name: 'Kiln Co', stateCode: '09' });
    expect(result.success).toBe(true);
  });

  it('treats a blank kiln address as none', () => {
    const result = createSiteSchema.safeParse({ name: 'Kiln One', code: 'K1', address: '' });
    expect(result.success).toBe(true);
    expect(result.data?.address).toBeNull();
    // The default still applies.
    expect(result.data?.type).toBe('kiln');
  });

  it('lets an edit clear a user email', () => {
    const result = updateUserSchema.safeParse({ email: '' });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBeNull();
  });

  it('leaves an absent key as undefined, so a PATCH does not wipe the field', () => {
    // `undefined` means "leave as is"; `null` means "clear it". The backend
    // checks `dto.email !== undefined`, so collapsing the two would make every
    // partial update erase the email.
    const result = updateUserSchema.safeParse({ name: 'Ramesh Kumar' });

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('email', null);
    expect(result.data?.email).toBeUndefined();
  });
});

/**
 * Regression: the amount pattern needs at least one digit, so `""` failed it.
 * Every voucher leaves one side of each line blank, so an ordinary two-line
 * entry was rejected on the two fields the user correctly left empty.
 */
describe('voucher amounts accept a blank side', () => {
  const line = (ledgerId: string, debit: string, credit: string) => ({ ledgerId, debit, credit });
  const CASH = '11111111-1111-4111-8111-111111111111';
  const SALES = '22222222-2222-4222-8222-222222222222';

  it('accepts a normal two-line voucher with one side blank on each', () => {
    const result = createVoucherSchema.safeParse({
      voucherType: 'payment',
      voucherDate: '2026-06-15',
      lines: [line(CASH, '1000.00', ''), line(SALES, '', '1000.00')],
    });

    expect(result.success).toBe(true);
    expect(result.data?.lines[0]).toMatchObject({ debit: '1000.00', credit: undefined });
    expect(result.data?.lines[1]).toMatchObject({ debit: undefined, credit: '1000.00' });
  });

  it('still rejects a line with amounts on both sides', () => {
    const result = createVoucherSchema.safeParse({
      voucherType: 'journal',
      voucherDate: '2026-06-15',
      lines: [line(CASH, '100.00', '100.00'), line(SALES, '', '100.00')],
    });

    expect(result.success).toBe(false);
  });

  it('still rejects a malformed amount', () => {
    const result = createVoucherSchema.safeParse({
      voucherType: 'journal',
      voucherDate: '2026-06-15',
      lines: [line(CASH, 'abc', ''), line(SALES, '', '100.00')],
    });

    expect(result.success).toBe(false);
  });

  it('reads a blank opening balance as zero', () => {
    const result = openingBalanceSchema.safeParse({ ledgerId: CASH, openingDebit: '5000.00', openingCredit: '' });

    expect(result.success).toBe(true);
    expect(result.data?.openingCredit).toBe('0.00');
  });
});
