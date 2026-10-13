'use client';

import { useState } from 'react';
import { PERMISSIONS, formatINR, formatQty, todayISO } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/data-table';
import { useSession } from '@/features/auth/use-auth';
import { useCostPerThousand } from '@/features/dashboard/hooks';
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
  const { can } = useSession();
  const [filters, setFilters] = useState({ fromDate: startOfMonth(), toDate: todayISO() });
  const { data, isLoading } = useCostPerThousand(filters);

  if (!can(PERMISSIONS.ACCOUNTS_VIEW)) {
    return <Alert variant="info">You do not have access to the accounts.</Alert>;
  }

  const columns: Column<CostRow>[] = [
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
      </div>

      <p className="text-sm text-muted-foreground">
        Each row is one kiln-month × brick type. Buckets are allocated by fired share within the kiln-month (ADR-049); a
        chamber fires every grade together, so the share is the only honest allocation key.
      </p>

      <DataTable<CostRow>
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => `${r.siteId}-${r.month}-${r.brickTypeId}`}
        isLoading={isLoading}
        empty={<Alert variant="info">No sorted output in this window.</Alert>}
      />
    </div>
  );
}
