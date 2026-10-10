'use client';

import { BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatQuantity, todayISO } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { useBrickTypes } from '@/features/masters/hooks';
import type { ProductionReportRow } from '@/features/production/api';
import { useProductionReport } from '@/features/production/hooks';

function defaultRange(): { from: string; to: string } {
  const to = todayISO();
  const past = new Date();
  past.setDate(past.getDate() - 90);
  return { from: todayISO(past), to };
}

/** PRD-07 — production report by day / month / year, per kiln and grade. */
export default function ProductionReportPage() {
  const { sites } = useSession();
  const { data: brickTypes } = useBrickTypes({ limit: 100, isActive: 'true' });
  const [range, setRange] = useState(defaultRange);
  const [siteId, setSiteId] = useState('');
  const [brickTypeId, setBrickTypeId] = useState('');
  const [groupBy, setGroupBy] = useState<'day' | 'month' | 'year'>('month');

  const { data, isLoading, isError, error } = useProductionReport({
    from: range.from,
    to: range.to,
    groupBy,
    ...(siteId ? { siteId } : {}),
    ...(brickTypeId ? { brickTypeId } : {}),
  });

  const columns: Column<ProductionReportRow>[] = [
    {
      key: 'period',
      header: 'Period',
      render: (r) => (groupBy === 'day' ? formatDate(r.period) : r.period),
    },
    { key: 'site', header: 'Kiln', render: (r) => r.siteName },
    { key: 'grade', header: 'Grade', render: (r) => r.grade },
    {
      key: 'batches',
      header: 'Batches',
      className: 'text-right',
      render: (r) => r.batchCount,
    },
    {
      key: 'goodBricks',
      header: 'Good bricks',
      className: 'text-right font-medium',
      render: (r) => formatQuantity(r.goodBricks),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
        <Select label="Grade" value={brickTypeId} onChange={(e) => setBrickTypeId(e.target.value)}>
          <option value="">All grades</option>
          {brickTypes?.items.map((b) => (
            <option key={b.id} value={b.id}>
              {b.grade}
            </option>
          ))}
        </Select>
        <Select label="Group by" value={groupBy} onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}>
          <option value="day">By day</option>
          <option value="month">By month</option>
          <option value="year">By year</option>
        </Select>
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load the production report')}</Alert>}

      {data && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs text-muted-foreground">Total good bricks produced</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {formatQuantity(data.totals.goodBricks)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs text-muted-foreground">Total sorted batches</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{data.totals.batchCount}</p>
          </div>
        </div>
      )}

      <DataTable
        caption="Production report by period and grade"
        columns={columns}
        rows={data?.rows ?? []}
        rowKey={(r) => `${r.period}-${r.siteId}-${r.brickTypeId}`}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={BarChart3}
            title="No production data"
            description="No sorted production batches were found for this date range and filters."
          />
        }
      />
    </div>
  );
}
