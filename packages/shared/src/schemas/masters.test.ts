import { describe, expect, it } from 'vitest';
import { createHsnRateSchema, updateHsnRateSchema } from './taxes';
import { createWageRateSchema } from './labour';
import { createPartySchema } from './parties';
import { createItemSchema, createUnitSchema } from './inventory-masters';

/**
 * Rates and money are decimal strings end to end. P3.1c first typed them as
 * `z.number()`, which both lied about what NUMERIC(18,2) returns and let a
 * float into a GST calculation; and because an update echoed the request back
 * unparsed, the same field came out as "6.00" on create and "6" on update.
 */
describe('HSN / GST rates', () => {
  it('normalises a whole-number rate to two decimals', () => {
    const parsed = createHsnRateSchema.parse({ hsnCode: '6904', cgstRate: '6', sgstRate: '6', igstRate: '12' });
    expect(parsed.cgstRate).toBe('6.00');
    expect(parsed.igstRate).toBe('12.00');
  });

  it('keeps a fractional rate', () => {
    expect(createHsnRateSchema.parse({ hsnCode: '6904', igstRate: '2.5' }).igstRate).toBe('2.50');
  });

  it('defaults an omitted rate to zero', () => {
    const parsed = createHsnRateSchema.parse({ hsnCode: '6904' });
    expect(parsed.cgstRate).toBe('0.00');
  });

  it('normalises on update too, so both verbs return the same shape', () => {
    expect(updateHsnRateSchema.parse({ igstRate: '18' }).igstRate).toBe('18.00');
  });

  it('rejects a rate above 100', () => {
    expect(() => createHsnRateSchema.parse({ hsnCode: '6904', igstRate: '101' })).toThrow();
  });

  it('rejects a rate that is not a number', () => {
    expect(() => createHsnRateSchema.parse({ hsnCode: '6904', igstRate: 'twelve' })).toThrow();
  });

  it('rejects an empty HSN code', () => {
    expect(() => createHsnRateSchema.parse({ hsnCode: '' })).toThrow();
  });
});

describe('wage rates', () => {
  it('normalises the amount to paise', () => {
    const parsed = createWageRateSchema.parse({ activity: 'making', unit: '1000 bricks', rateAmount: '650' });
    expect(parsed.rateAmount).toBe('650.00');
  });

  it('rejects a zero rate', () => {
    expect(() => createWageRateSchema.parse({ activity: 'making', unit: 'day', rateAmount: '0' })).toThrow();
  });

  it('rejects an activity outside the allowed set', () => {
    expect(() => createWageRateSchema.parse({ activity: 'dancing', unit: 'day', rateAmount: '10' })).toThrow();
  });

  it('rejects more than two decimal places', () => {
    expect(() => createWageRateSchema.parse({ activity: 'making', unit: 'day', rateAmount: '10.005' })).toThrow();
  });
});

describe('party master', () => {
  it('turns a blank optional field into null rather than failing validation', () => {
    // Every web form sends "" for an untouched field; `.email()` rejects it.
    const parsed = createPartySchema.parse({ name: 'Shyam Traders', partyTypes: ['customer'], gstin: '', email: '' });
    expect(parsed.gstin).toBeNull();
    expect(parsed.email).toBeNull();
  });

  it('defaults both opening balances to zero', () => {
    const parsed = createPartySchema.parse({ name: 'Shyam Traders', partyTypes: ['customer'] });
    expect(parsed.openingDebit).toBe('0.00');
    expect(parsed.openingCredit).toBe('0.00');
  });

  it('requires at least one party type', () => {
    expect(() => createPartySchema.parse({ name: 'Nobody', partyTypes: [] })).toThrow();
  });

  it('rejects a GSTIN that is not 15 characters', () => {
    expect(() => createPartySchema.parse({ name: 'Shyam', partyTypes: ['customer'], gstin: '22AAAAA' })).toThrow();
  });
});

describe('inventory masters', () => {
  it('rejects an abbreviation longer than the column', () => {
    expect(() => createUnitSchema.parse({ name: 'Quintals', abbreviation: 'abcdefghijk' })).toThrow();
  });

  it('treats a blank HSN id as "not set yet"', () => {
    const parsed = createItemSchema.parse({
      name: 'Coal',
      category: 'raw_material',
      unitId: '0f7c1e4a-2b3c-4d5e-8f90-1a2b3c4d5e6f',
      hsnId: '',
    });
    expect(parsed.hsnId).toBeNull();
  });

  it('rejects a category outside the allowed set', () => {
    expect(() =>
      createItemSchema.parse({
        name: 'Diesel',
        category: 'fuel',
        unitId: '0f7c1e4a-2b3c-4d5e-8f90-1a2b3c4d5e6f',
      }),
    ).toThrow();
  });
});
