import Decimal from 'decimal.js';
import { BRICKS_PER_RATE_UNIT } from '@brics/shared';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

/** Money helpers. Money is a decimal string in DB/JSON, `Decimal` in code. Never use JS numbers for money. */
export const Money = {
  of(value: Decimal.Value): Decimal {
    return new Decimal(value);
  },
  /** Rounded to paise and serialised for DB/JSON, e.g. "1250.00". */
  toString(value: Decimal.Value): string {
    return new Decimal(value).toFixed(2);
  },
  sum(values: Decimal.Value[]): Decimal {
    return values.reduce<Decimal>((acc, v) => acc.plus(v), new Decimal(0));
  },
  /** Amount for `quantity` bricks at `ratePer1000`. */
  forBricks(quantity: number, ratePer1000: Decimal.Value): Decimal {
    return new Decimal(ratePer1000).mul(quantity).div(BRICKS_PER_RATE_UNIT).toDecimalPlaces(2);
  },
  /** Percentage of an amount, rounded to paise (e.g. GST). */
  percent(amount: Decimal.Value, rate: Decimal.Value): Decimal {
    return new Decimal(amount).mul(rate).div(100).toDecimalPlaces(2);
  },
};
