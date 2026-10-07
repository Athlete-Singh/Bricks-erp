import { Money } from './money';

describe('Money', () => {
  it('adds without floating point error', () => {
    expect(Money.toString(Money.sum(['0.10', '0.20']))).toBe('0.30');
  });

  it('prices bricks per 1,000', () => {
    expect(Money.toString(Money.forBricks(10_000, '6500'))).toBe('65000.00');
    expect(Money.toString(Money.forBricks(1_250, '6500'))).toBe('8125.00');
  });

  it('rounds percentages half-up to paise', () => {
    expect(Money.toString(Money.percent('65000', '6'))).toBe('3900.00');
    expect(Money.toString(Money.percent('100.25', '2.5'))).toBe('2.51');
  });
});
