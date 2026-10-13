'use client';

import { useState } from 'react';
import { PERMISSIONS, formatINR, formatQty, todayISO } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/use-auth';
import { useDailyReport } from '@/features/dashboard/hooks';

/**
 * RPT-02 — the owner's "what happened yesterday" page. One date → one tile
 * grid of the numbers that matter: production, dispatch, sales, collection,
 * expenses, coal and diesel cost, and the headcount actually present on site.
 */
export default function DailyReportPage() {
  const { can, sites } = useSession();
  const [date, setDate] = useState(todayISO());
  const [siteId, setSiteId] = useState('');
  const { data, isLoading } = useDailyReport({ date, siteId: siteId || undefined });

  if (!can(PERMISSIONS.ACCOUNTS_VIEW)) {
    return <Alert variant="info">You do not have access to the accounts.</Alert>;
  }

  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Date</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <Select label="Kiln" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">All kilns</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : !meta ? (
        <Alert variant="info">Nothing happened on {date}.</Alert>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="Fired bricks"
            value={formatQty(Number(meta.production.fired))}
            hint={`${formatQty(Number(meta.production.sorted))} sorted`}
          />
          <Tile
            label="Dispatched"
            value={formatQty(Number(meta.dispatch.bricks))}
            hint={`${meta.dispatch.challans} challan${meta.dispatch.challans === 1 ? '' : 's'}`}
          />
          <Tile
            label="Sales invoiced"
            value={formatINR(meta.sales.invoiced)}
            hint={`${meta.sales.invoices} invoice${meta.sales.invoices === 1 ? '' : 's'}`}
          />
          <Tile label="Collection" value={formatINR(meta.collection)} />
          <Tile label="Expenses" value={formatINR(meta.expenses)} />
          <Tile label="Coal cost" value={formatINR(meta.coalCost)} />
          <Tile label="Diesel cost" value={formatINR(meta.dieselCost)} />
          <Tile label="Labour present" value={String(meta.labourPresent)} />
        </div>
      )}

      {meta && meta.consumption.length > 0 && (
        <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Issued to production</h2>
          {/* "How much coal went in" is a quantity question: a dearer load
              raises the cost without a gram more being burnt. */}
          <ul className="flex flex-col gap-1 text-sm">
            {meta.consumption.map((c) => (
              <li key={c.itemId} className="flex justify-between">
                <span>{c.itemName}</span>
                <span className="tabular-nums">
                  {formatQty(Number(c.quantity))} {c.unit}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
