'use client';

import { TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS, formatINR, todayISO } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/shared/data-table';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { useVehicles } from '@/features/masters/hooks';
import type { VehicleProfitRow } from '@/features/dispatch/api';
import { useVehicleProfitability } from '@/features/dispatch/hooks';

function startOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/** VEH-07 — what each vehicle earned as freight, against what it cost to run. */
export default function VehiclePnlPage() {
  const { can } = useSession();
  const { data: vehicles } = useVehicles({ limit: 100 });
  const [filters, setFilters] = useState({ fromDate: startOfMonth(), toDate: todayISO(), vehicleId: '' });

  const { data, isLoading, isError, error } = useVehicleProfitability({
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    vehicleId: filters.vehicleId || undefined,
  });

  if (!can(PERMISSIONS.TRANSPORT_VIEW)) {
    return <Alert variant="info">You do not have access to transport.</Alert>;
  }

  const columns: Column<VehicleProfitRow>[] = [
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium">{r.registrationNo}</span>
          <span className="text-xs text-muted-foreground">
            {r.ownerType === 'hired' ? 'hired' : 'own'} · {r.tripCount} trip{r.tripCount === 1 ? '' : 's'}
          </span>
        </div>
      ),
    },
    { key: 'income', header: 'Freight earned', className: 'text-right', render: (r) => formatINR(r.freightIncome) },
    {
      key: 'diesel',
      header: 'Diesel',
      className: 'text-right',
      hideOnMobile: true,
      render: (r) => formatINR(r.diesel),
    },
    {
      key: 'repairs',
      header: 'Repairs',
      className: 'text-right',
      hideOnMobile: true,
      render: (r) => formatINR(r.maintenance),
    },
    {
      key: 'loading',
      header: 'Loading',
      className: 'text-right',
      hideOnMobile: true,
      render: (r) => formatINR(r.loading),
    },
    { key: 'hire', header: 'Hire', className: 'text-right', hideOnMobile: true, render: (r) => formatINR(r.hire) },
    { key: 'cost', header: 'Total cost', className: 'text-right', render: (r) => formatINR(r.totalCost) },
    {
      key: 'net',
      header: 'Net',
      className: 'text-right',
      render: (r) => (
        <span className={Number(r.net) < 0 ? 'font-medium text-danger' : 'font-medium text-foreground'}>
          {formatINR(r.net)}
        </span>
      ),
    },
    {
      key: 'perKm',
      header: 'Cost / km',
      className: 'text-right',
      hideOnMobile: true,
      render: (r) => (r.costPerKm === null ? '—' : formatINR(r.costPerKm)),
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
          label="Vehicle"
          value={filters.vehicleId}
          onChange={(e) => setFilters((f) => ({ ...f, vehicleId: e.target.value }))}
        >
          <option value="">All vehicles</option>
          {vehicles?.items.map((v) => (
            <option key={v.id} value={v.id}>
              {v.registrationNo}
            </option>
          ))}
        </Select>
      </div>

      {isError && <Alert variant="error">{messageOf(error)}</Alert>}

      {meta && (
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Freight earned" value={formatINR(meta.freightIncome)} />
          <SummaryCard label="Run cost" value={formatINR(meta.totalCost)} />
          <SummaryCard label="Net" value={formatINR(meta.net)} danger={Number(meta.net) < 0} />
        </div>
      )}

      <Alert variant="info">
        Freight billed on a sales invoice is not counted here — that income belongs to the sale. This says what each
        vehicle earned <em>as freight</em>, against what it cost to run.
      </Alert>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.vehicleId}
        isLoading={isLoading}
        caption="Vehicle profitability"
        empty={
          <EmptyState
            icon={TrendingUp}
            title="Nothing to compare yet"
            description="Log trips and vehicle charges, and each truck's running cost shows up here."
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
