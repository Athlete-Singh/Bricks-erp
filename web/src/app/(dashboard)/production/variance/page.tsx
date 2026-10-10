'use client';

import { AlertTriangle, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { formatQuantity, isNegativeQuantity, isZeroQuantity, todayISO } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { useItems } from '@/features/masters/hooks';
import type { FuelVarianceRow, YieldVarianceRow } from '@/features/production/api';
import { useFuelVariance, useYieldVariance } from '@/features/production/hooks';

/** The last 90 days, which is the window an owner usually wants. */
function defaultRange(): { from: string; to: string } {
  const to = todayISO();
  const past = new Date();
  past.setDate(past.getDate() - 90);
  return { from: todayISO(past), to };
}

export default function VariancePage() {
  const { sites } = useSession();
  const [range, setRange] = useState(defaultRange);
  const [siteId, setSiteId] = useState('');

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="From"
          type="date"
          value={range.from}
          onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
        />
        <Input
          label="To"
          type="date"
          value={range.to}
          onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
        />
        <Select label="Kiln" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">All kilns</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      <YieldVariance from={range.from} to={range.to} siteId={siteId} />
      <FuelVariance from={range.from} to={range.to} siteId={siteId} />
    </div>
  );
}

/** LEK-01 — where the bricks went. */
function YieldVariance({ from, to, siteId }: { from: string; to: string; siteId: string }) {
  const [groupBy, setGroupBy] = useState<'batch' | 'chamber' | 'sardar'>('batch');
  const { data, isLoading, isError, error } = useYieldVariance({
    from,
    to,
    groupBy,
    ...(siteId ? { siteId } : {}),
  });

  const pending = data?.filter((r) => !r.sortingComplete).length ?? 0;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Brick yield</h2>
          <p className="text-xs text-muted-foreground">Where the bricks went between moulding and finished stock</p>
        </div>
        <Select label="Group by" value={groupBy} onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}>
          <option value="batch">Each batch</option>
          <option value="chamber">Chamber</option>
          <option value="sardar">Sardar gang</option>
        </Select>
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load the yield variance')}</Alert>}
      {isLoading && <Skeleton className="h-48 w-full" role="status" aria-label="Loading" />}

      {pending > 0 && (
        <Alert variant="info">
          {pending === 1 ? '1 row is' : `${pending} rows are`} still waiting to be sorted, so no loss can be calculated
          for {pending === 1 ? 'it' : 'them'} yet.
        </Alert>
      )}

      {data && data.length === 0 && (
        <EmptyState icon={TrendingDown} title="Nothing in this period" description="Try a wider date range." />
      )}

      {data && data.length > 0 && <YieldTable rows={data} />}
    </section>
  );
}

function YieldTable({ rows }: { rows: YieldVarianceRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">Brick yield variance</caption>
        <thead>
          <tr className="border-b border-border bg-surface-muted text-xs text-muted-foreground">
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Group
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Moulded
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Fired
            </th>
            <th scope="col" className="hidden px-3 py-2 text-right font-medium md:table-cell">
              Good
            </th>
            <th scope="col" className="hidden px-3 py-2 text-right font-medium lg:table-cell">
              Drying loss
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Unaccounted after firing
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.groupId} className="border-b border-border last:border-0">
              <td className="px-3 py-2">
                <span className="font-medium">{row.groupLabel}</span>
                {!row.sortingComplete && (
                  <Badge variant="muted" className="ml-2">
                    {row.pendingSortCount === row.batchCount ? 'Not sorted yet' : `${row.pendingSortCount} pending`}
                  </Badge>
                )}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatQuantity(row.greenMoulded)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatQuantity(row.fired)}</td>
              <td className="hidden px-3 py-2 text-right tabular-nums md:table-cell">
                {formatQuantity(row.goodTotal)}
              </td>
              <td className="hidden px-3 py-2 text-right tabular-nums text-muted-foreground lg:table-cell">
                {/* Ordinary handling and drying breakage — not a leakage signal. */}
                {isZeroQuantity(row.preFiringLoss) ? '—' : formatQuantity(row.preFiringLoss)}
              </td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                {row.postFiringLoss === null ? (
                  // Null, not zero: nobody has counted these bricks yet.
                  <span className="font-normal text-muted-foreground">Not known yet</span>
                ) : isZeroQuantity(row.postFiringLoss) ? (
                  <span className="font-normal text-muted-foreground">All accounted for</span>
                ) : (
                  <span className={isNegativeQuantity(row.postFiringLoss) ? 'text-warning' : 'text-danger'}>
                    {formatQuantity(row.postFiringLoss)}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** LEK-02 — fuel burned per 1,000 bricks, and which batches are out of line. */
function FuelVariance({ from, to, siteId }: { from: string; to: string; siteId: string }) {
  const [groupBy, setGroupBy] = useState<'batch' | 'kiln' | 'month'>('batch');
  const [itemId, setItemId] = useState('');
  const { data: items } = useItems({ limit: 100, isActive: 'true' });
  const fuels = items?.items.filter((i) => i.category === 'raw_material') ?? [];

  const { data, isLoading, isError, error } = useFuelVariance({
    from,
    to,
    itemId,
    groupBy,
    ...(siteId ? { siteId } : {}),
  });

  const unbooked = data?.filter((r) => !r.fuelRecorded).length ?? 0;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Fuel per 1,000 bricks</h2>
          <p className="text-xs text-muted-foreground">Compared against the middle batch in this window</p>
        </div>
        <div className="flex gap-3">
          <Select label="Fuel" value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">Choose a fuel…</option>
            {fuels.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
          <Select label="Compare" value={groupBy} onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}>
            <option value="batch">Batch to batch</option>
            <option value="kiln">Kiln to kiln</option>
            <option value="month">Month to month</option>
          </Select>
        </div>
      </div>

      {!itemId && (
        <Alert variant="info">Pick a fuel to compare — a kiln may burn coal one month and petcoke the next.</Alert>
      )}

      {isError && <Alert variant="error">{messageOf(error, 'Could not load the fuel variance')}</Alert>}
      {itemId && isLoading && <Skeleton className="h-48 w-full" role="status" aria-label="Loading" />}

      {unbooked > 0 && (
        <Alert variant="warning">
          {unbooked === 1 ? '1 row has' : `${unbooked} rows have`} no fuel recorded at all. That is a missing entry, not
          a frugal kiln — {unbooked === 1 ? 'it is' : 'they are'} left out of the comparison.
        </Alert>
      )}

      {itemId && data && data.length === 0 && (
        <EmptyState icon={TrendingDown} title="Nothing fired in this period" description="Try a wider date range." />
      )}

      {data && data.length > 0 && <FuelTable rows={data} />}
    </section>
  );
}

function FuelTable({ rows }: { rows: FuelVarianceRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">Fuel per 1,000 bricks</caption>
        <thead>
          <tr className="border-b border-border bg-surface-muted text-xs text-muted-foreground">
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Group
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Fired
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Fuel used
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Per 1,000
            </th>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              &nbsp;
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.groupId} className="border-b border-border last:border-0">
              <td className="px-3 py-2 font-medium">{row.groupLabel}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatQuantity(row.firedTotal)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatQuantity(row.fuelConsumed)}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                {row.ratio === null ? (
                  <span className="font-normal text-muted-foreground">—</span>
                ) : (
                  formatQuantity(row.ratio)
                )}
              </td>
              <td className="px-3 py-2">
                {!row.fuelRecorded && <span className="text-xs text-muted-foreground">No fuel recorded</span>}
                {row.isOutlier && (
                  <Badge variant={row.direction === 'over' ? 'warning' : 'muted'}>
                    <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />
                    {row.direction === 'over' ? 'Using more than usual' : 'Using less than usual'}
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
