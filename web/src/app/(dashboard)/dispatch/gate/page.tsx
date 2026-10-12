'use client';

import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS, formatDate, todayISO } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/shared/data-table';
import { messageOf, useSession } from '@/features/auth/use-auth';
import type { GateRow } from '@/features/dispatch/api';
import { useGateReconciliation } from '@/features/dispatch/hooks';

function startOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * LEK-04 — did every truck that left the gate get billed?
 *
 * The headline is the count of unbilled challans, because that is the leak the
 * client described. The three quantity columns are there so a disputed row can
 * be settled without opening three other screens.
 */
export default function GateReportPage() {
  const { can, sites } = useSession();
  const [filters, setFilters] = useState({ fromDate: startOfMonth(), toDate: todayISO(), siteId: '' });

  const { data, isLoading, isError, error } = useGateReconciliation({
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    siteId: filters.siteId || undefined,
  });

  if (!can(PERMISSIONS.DISPATCH_VIEW)) {
    return <Alert variant="info">You do not have access to the gate report.</Alert>;
  }

  const columns: Column<GateRow>[] = [
    { key: 'no', header: 'Challan', render: (r) => <span className="font-medium">{r.challanNo}</span> },
    { key: 'date', header: 'Left on', render: (r) => formatDate(r.dispatchDate) },
    { key: 'customer', header: 'Customer', render: (r) => r.customerName },
    { key: 'vehicle', header: 'Vehicle', hideOnMobile: true, render: (r) => r.vehicleNo ?? '—' },
    { key: 'out', header: 'Dispatched', className: 'text-right', render: (r) => r.dispatchedQuantity },
    {
      key: 'billed',
      header: 'Invoiced',
      className: 'text-right',
      render: (r) => (r.invoicedQuantity === null ? '—' : r.invoicedQuantity),
    },
    { key: 'stock', header: 'Stock out', hideOnMobile: true, className: 'text-right', render: (r) => r.stockQuantity },
    {
      key: 'verdict',
      header: 'Billing',
      render: (r) =>
        r.unbilled ? (
          <Badge variant="danger">No bill</Badge>
        ) : r.quantityMismatch ? (
          <Badge variant="warning">Part billed · {r.invoiceNo}</Badge>
        ) : (
          <Badge variant="success">{r.invoiceNo}</Badge>
        ),
    },
  ];

  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="From"
          type="date"
          value={filters.fromDate}
          onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
        />
        <Input
          label="To"
          type="date"
          value={filters.toDate}
          onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
        />
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
      </div>

      {isError && <Alert variant="error">{messageOf(error)}</Alert>}

      {meta && (
        <div className="grid gap-3 sm:grid-cols-4">
          <SummaryCard label="Trucks out" value={String(meta.dispatchCount)} />
          <SummaryCard label="Dispatched" value={meta.dispatchedQuantity} />
          <SummaryCard label="Invoiced" value={meta.invoicedQuantity} />
          <SummaryCard
            label="Left without a bill"
            value={`${meta.unbilledCount} · ${meta.unbilledQuantity}`}
            danger={meta.unbilledCount > 0}
          />
        </div>
      )}

      {meta && meta.unbilledCount > 0 && (
        <Alert variant="error">
          {meta.unbilledCount === 1 ? 'One truck' : `${meta.unbilledCount} trucks`} left the gate in this window with no
          invoice against the load — {meta.unbilledQuantity} bricks gone with nothing to collect against.
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.dispatchId}
        isLoading={isLoading}
        caption="Gate reconciliation"
        empty={
          <EmptyState
            icon={ShieldCheck}
            title="No trucks left the gate in this window"
            description="Only confirmed and delivered challans are counted — a draft has not moved anything."
          />
        }
      />
    </div>
  );
}

function SummaryCard({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${danger ? 'text-danger' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
