import { describe, expect, it } from 'vitest';
import {
  formatQuantity,
  fromThousandths,
  isNegativeQuantity,
  isZeroQuantity,
  subtractQuantities,
  sumQuantities,
  toThousandths,
} from './quantity';

/**
 * Quantities carry three decimals, and the money helpers cannot stand in for
 * these: `toPaise` truncates at two, so a tonne weight would lose its last
 * digit without anything failing.
 */
describe('quantity arithmetic', () => {
  it('keeps the third decimal that the money helpers would drop', () => {
    expect(toThousandths('12.345')).toBe(12345);
    expect(fromThousandths(12345)).toBe('12.345');
  });

  it('subtracts without floating-point drift', () => {
    // 0.1 + 0.2 - 0.3 is not 0 in binary floating point.
    expect(subtractQuantities('0.300', sumQuantities(['0.100', '0.200']))).toBe('0.000');
  });

  it('adds a column of weights exactly', () => {
    expect(sumQuantities(['100', '250.500', '0.250'])).toBe('350.750');
  });

  it('handles a negative result, which an adjustment can cause', () => {
    expect(subtractQuantities('10', '25')).toBe('-15.000');
    expect(isNegativeQuantity('-15.000')).toBe(true);
    expect(isNegativeQuantity('0.000')).toBe(false);
  });

  it('counts a brick quantity far above the paise helpers comfort zone', () => {
    expect(sumQuantities(['50000', '40000'])).toBe('90000.000');
  });

  it('treats blank and null as zero rather than NaN', () => {
    expect(isZeroQuantity(null)).toBe(true);
    expect(isZeroQuantity('')).toBe(true);
    expect(isZeroQuantity('0.000')).toBe(true);
    expect(isZeroQuantity('0.001')).toBe(false);
  });
});

describe('formatQuantity', () => {
  it('groups Indian style and drops trailing zeros', () => {
    expect(formatQuantity('40000.000')).toBe('40,000');
    expect(formatQuantity('125000.000')).toBe('1,25,000');
    expect(formatQuantity('12.500')).toBe('12.5');
  });

  it('shows a dash rather than NaN when there is nothing to show', () => {
    expect(formatQuantity(null)).toBe('—');
    expect(formatQuantity('')).toBe('—');
  });

  it('keeps the sign on a negative balance', () => {
    expect(formatQuantity('-500.000')).toBe('-500');
  });
});
