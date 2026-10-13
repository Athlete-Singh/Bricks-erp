'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS, formatINR, formatQty, todayISO } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/shared/data-table';
import { useSession } from '@/features/auth/use-auth';
import { useCostPerThousand } from '@/features/dashboard/hooks';
import { useBrickTypes } from '@/features/masters/hooks';
import { downloadCsv } from '@/features/dashboard/csv';
import type { CostRow } from '@/features/dashboard/api';

function startOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * CST-01 — kiln × month × brick type table with the seven cost buckets and
 * the delta to the ₹4,100 benchmark. Rows over benchmark wear a danger badge
 * so an owner reading the table can spot the outliers without scanning
 * numbers.
 */
export default function CostPerThousandPage() {
  const { can, sites } = useSession();
  const [filters, setFilters] = useState({ fromDate: startOfMonth(), toDate: todayISO(), siteId: '', brickTypeId: '' });
  const { data, isLoading } = useCostPerThousand({
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    siteId: filters.siteId || undefined,
    brickTypeId: filters.brickTypeId || undefined,
  });
  const brickTypes = useBrickTypes();
  const kilnName = (id: string) => sites.find((s) => s.id === id)?.name ?? '—';

  if (!can(PERMISSIONS.ACCOUNTS_VIEW)) {
    return <Alert variant="info">You do not have access to the accounts.</Alert>;
  }

  const rows = data?.items ?? [];

  const onExport = () => {
    if (!rows.length) return;
    downloadCsv(
      `cost-per-1000-${filters.fromDate}-${filters.toDate}.csv`,
      [
        'Kiln',
        'Month',
        'Brick type',
        'Fired bricks',
        'Labour',
        'Coal',
        'Soil',
        'Electricity',
        'Loading',
        'Repairs',
        'Other',
        'Total cost',
        'Cost per 1,000',
        'Sold bricks',
        'Realised per 1,000',
        'Gross margin %',
        'vs benchmark',
      ],
      rows.map((r) => [
        kilnName(r.siteId),
        r.month,
        r.brickTypeGrade,
        r.firedBricks,
        r.buckets.labour,
        r.buckets.coal,
        r.buckets.soil,
        r.buckets.electricity,
        r.buckets.loading,
        r.buckets.repairs,
        r.buckets.other,
        r.totalCost,
        r.costPerThousand ?? '',
        r.soldBricks,
        r.sellingPricePerThousand ?? '',
        r.grossMarginPercent ?? '',
        r.deltaVsBenchmark ?? '',
      ]),
    );
  };

  const columns: Column<CostRow>[] = [
    // The report is by kiln × month × brick type, so the kiln has to be on the
    // row — two kilns firing the same grade in the same month are otherwise
    // two identical-looking lines.
    { key: 'kiln', header: 'Kiln', render: (r) => kilnName(r.siteId) },
    { key: 'month', header: 'Month', render: (r) => <span className="tabular-nums">{r.month}</span> },
    { key: 'grade', header: 'Brick type', render: (r) => r.brickTypeGrade },
    { key: 'fired', header: 'Fired bricks', hideOnMobile: true, render: (r) => formatQty(Number(r.firedBricks)) },
    { key: 'labour', header: 'Labour', hideOnMobile: true, render: (r) => formatINR(r.buckets.labour) },
    { key: 'coal', header: 'Coal', hideOnMobile: true, render: (r) => formatINR(r.buckets.coal) },
    { key: 'soil', header: 'Soil', hideOnMobile: true, render: (r) => formatINR(r.buckets.soil) },
    { key: 'elec', header: 'Electricity', hideOnMobile: true, render: (r) => formatINR(r.buckets.electricity) },
    { key: 'load', header: 'Loading', hideOnMobile: true, render: (r) => formatINR(r.buckets.loading) },
    { key: 'rep', header: 'Repairs', hideOnMobile: true, render: (r) => formatINR(r.buckets.repairs) },
    { key: 'oth', header: 'Other', hideOnMobile: true, render: (r) => formatINR(r.buckets.other) },
    {
      key: 'total',
      header: 'Total cost',
      render: (r) => <span className="tabular-nums">{formatINR(r.totalCost)}</span>,
    },
    {
      key: 'perK',
      header: '₹ / 1,000',
      render: (r) =>
        r.costPerThousand === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="tabular-nums font-medium">{formatINR(r.costPerThousand)}</span>
        ),
    },
    {
      key: 'price',
      header: 'Realised / 1,000',
      render: (r) =>
        r.sellingPricePerThousand === null ? (
          <span className="text-muted-foreground" title="None of this grade was invoiced in this month">
            —
          </span>
        ) : (
          <span className="tabular-nums">{formatINR(r.sellingPricePerThousand)}</span>
        ),
    },
    {
      key: 'margin',
      header: 'Gross margin',
      render: (r) => {
        if (r.grossMarginPercent === null) return <span className="text-muted-foreground">—</span>;
        const pct = Number(r.grossMarginPercent);
        // A grade sold for less than it cost is the one line an owner must see.
        return <span className={`tabular-nums font-medium ${pct < 0 ? 'text-danger' : ''}`}>{pct.toFixed(2)}%</span>;
      },
    },
    {
      key: 'delta',
      header: 'vs ₹4,100',
      render: (r) => {
        if (r.deltaVsBenchmark === null) return <span className="text-muted-foreground">—</span>;
        return r.overBenchmark ? (
          <Badge variant="danger" data-testid="cost-row-over">
            {formatINR(r.deltaVsBenchmark)} over
          </Badge>
        ) : Number(r.deltaVsBenchmark) < 0 ? (
          <Badge variant="success">{formatINR(Math.abs(Number(r.deltaVsBenchmark)))} under</Badge>
        ) : (
          <Badge variant="muted">on benchmark</Badge>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">From</span>
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">To</span>
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
            />
          </label>
          <Select
            label="Kiln"
            value={filters.siteId}
            onChange={(e) => setFilters((f) => ({ ...f, siteId: e.target.value }))}
          >
            <option value="">All kilns</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select
            label="Brick type"
            value={filters.brickTypeId}
            onChange={(e) => setFilters((f) => ({ ...f, brickTypeId: e.target.value }))}
          >
            <option value="">All grades</option>
            {(brickTypes.data?.items ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.grade}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={!rows.length}
          aria-label="Export cost per 1,000 as CSV"
        >
          <Download className="mr-2 h-4 w-4" aria-hidden /> Export CSV
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Each row is one kiln-month × brick type. Buckets are allocated by fired share within the kiln-month (ADR-049); a
        chamber fires every grade together, so the share is the only honest allocation key. The realised price is this
        grade&rsquo;s own: a grade is stocked and invoiced as one item (ADR-051), so what it fetched is read off the
        sales it appeared on, net of returns.
      </p>

      <DataTable<CostRow>
        columns={columns}
        rows={rows}
        rowKey={(r) => `${r.siteId}-${r.month}-${r.brickTypeId}`}
        isLoading={isLoading}
        empty={<Alert variant="info">No sorted output in this window.</Alert>}
      />
    </div>
  );
}
