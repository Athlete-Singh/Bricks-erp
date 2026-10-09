import { describe, expect, it } from 'vitest';
import { amountsEqual, fromPaise, isZeroAmount, subtractAmounts, sumAmounts, toPaise } from './money';

describe('money arithmetic', () => {
  describe('toPaise', () => {
    it('converts rupees and paise', () => {
      expect(toPaise('1250.50')).toBe(125050);
      expect(toPaise('0.01')).toBe(1);
      expect(toPaise('1000')).toBe(100000);
    });

    it('pads a single decimal place', () => {
      expect(toPaise('5.5')).toBe(550);
    });

    it('reads blank, null and undefined as zero', () => {
      expect(toPaise('')).toBe(0);
      expect(toPaise(null)).toBe(0);
      expect(toPaise(undefined)).toBe(0);
    });

    it('handles negatives', () => {
      expect(toPaise('-750.25')).toBe(-75025);
    });

    it('truncates beyond paise rather than rounding into it', () => {
      expect(toPaise('1.999')).toBe(199);
    });
  });

  describe('fromPaise', () => {
    it('always shows two decimal places', () => {
      expect(fromPaise(125050)).toBe('1250.50');
      expect(fromPaise(100000)).toBe('1000.00');
      expect(fromPaise(5)).toBe('0.05');
      expect(fromPaise(0)).toBe('0.00');
    });

    it('handles negatives', () => {
      expect(fromPaise(-75025)).toBe('-750.25');
      expect(fromPaise(-5)).toBe('-0.05');
    });
  });

  describe('sumAmounts', () => {
    it('adds without floating-point drift', () => {
      // 0.1 + 0.2 is 0.30000000000000004 with JS numbers, which would make a
      // voucher that balances on paper refuse to submit.
      expect(sumAmounts(['0.10', '0.20'])).toBe('0.30');
      expect(sumAmounts(['0.10', '0.10', '0.10'])).toBe('0.30');
    });

    it('adds a realistic voucher', () => {
      expect(sumAmounts(['325000.00', '85000.00', '60000.50'])).toBe('470000.50');
    });

    it('treats an empty list as zero', () => {
      expect(sumAmounts([])).toBe('0.00');
    });

    it('skips blank lines, which a half-filled form has', () => {
      expect(sumAmounts(['1000.00', '', null, undefined, '500.00'])).toBe('1500.00');
    });
  });

  describe('subtractAmounts', () => {
    it('reports the gap in an unbalanced voucher', () => {
      expect(subtractAmounts('1000.00', '900.00')).toBe('100.00');
      expect(subtractAmounts('900.00', '1000.00')).toBe('-100.00');
    });
  });

  describe('amountsEqual', () => {
    it('matches to the paisa', () => {
      expect(amountsEqual('1000.00', '1000')).toBe(true);
      expect(amountsEqual('1000.00', '1000.01')).toBe(false);
    });

    it('agrees that three tenths equal thirty paise', () => {
      expect(amountsEqual(sumAmounts(['0.10', '0.10', '0.10']), '0.30')).toBe(true);
    });
  });

  it('isZeroAmount covers blank and zero alike', () => {
    expect(isZeroAmount('')).toBe(true);
    expect(isZeroAmount('0.00')).toBe(true);
    expect(isZeroAmount(null)).toBe(true);
    expect(isZeroAmount('0.01')).toBe(false);
  });
});
