'use client';

import { Wallet } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatINR, isZeroAmount, PERMISSIONS, todayISO } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { useParties } from '@/features/masters/hooks';
import type { AgeingCustomer } from '@/features/sales/api';
import { useReceivablesAgeing } from '@/features/sales/hooks';

const BUCKETS = [
  { key: 'current', label: 'Not yet due' },
  { key: 'd1_30', label: '1–30 days' },
  { key: 'd31_60', label: '31–60' },
  { key: 'd61_90', label: '61–90' },
  { key: 'd90_plus', label: 'Over 90' },
] as const;

/** SAL-07 — what is owed to us, and how long it has been owed. */
export default function ReceivablesPage() {
  const { can, sites } = useSession();
  const { data: customers } = useParties({ limit: 100, type: 'customer' });
  const [filters, setFilters] = useState<{ asOf: string; customerPartyId?: string; siteId?: string }>({
    asOf: todayISO(),
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useReceivablesAgeing(filters);

  if (!can(PERMISSIONS.SALES_VIEW)) {
    return <Alert variant="info">You do not have access to receivables.</Alert>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="As at"
          type="date"
          value={filters.asOf}
          onChange={(e) => setFilters((f) => ({ ...f, asOf: e.target.value }))}
        />
        <Select
          label="Customer"
          value={filters.customerPartyId ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, customerPartyId: e.target.value || undefined }))}
        >
          <option value="">All customers</option>
          {customers?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          label="Kiln"
          value={filters.siteId ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, siteId: e.target.value || undefined }))}
        >
          <option value="">All kilns</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load receivables')}</Alert>}
      {isLoading && <Skeleton className="h-64 w-full" role="status" aria-label="Loading" />}

      {data && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {BUCKETS.map((b) => (
            <div key={b.key} className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs text-muted-foreground">{b.label}</p>
              <p
                className={`mt-1 text-base font-semibold tabular-nums ${
                  b.key === 'd90_plus' && !isZeroAmount(data.totals[b.key] ?? '0') ? 'text-danger' : ''
                }`}
              >
                {formatINR(data.totals[b.key] ?? '0.00')}
              </p>
            </div>
          ))}
          <div className="rounded-lg border border-primary/40 bg-surface p-3">
            <p className="text-xs text-muted-foreground">Total due to us</p>
            <p className="mt-1 text-base font-semibold tabular-nums">{formatINR(data.totals.outstanding ?? '0.00')}</p>
          </div>
        </div>
      )}

      {data && data.customers.length === 0 && (
        <EmptyState icon={Wallet} title="Nothing outstanding" description="Every invoice is fully collected." />
      )}

      {data && data.customers.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.customers.map((c) => (
            <CustomerRow
              key={c.customerPartyId}
              customer={c}
              open={expanded === c.customerPartyId}
              onToggle={() => setExpanded(expanded === c.customerPartyId ? null : c.customerPartyId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerRow({ customer, open, onToggle }: { customer: AgeingCustomer; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="font-medium text-foreground">{customer.customerName}</span>
        <span className="flex items-center gap-3">
          {!isZeroAmount(customer.buckets.d90_plus ?? '0') && <Badge variant="warning">Over 90 days</Badge>}
          <span className="font-semibold tabular-nums">{formatINR(customer.outstanding)}</span>
        </span>
      </button>

      {open && (
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">Unpaid invoices from {customer.customerName}</caption>
            <thead>
              <tr className="bg-surface-muted text-xs text-muted-foreground">
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Invoice
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Dated
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Due
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Days late
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Outstanding
                </th>
              </tr>
            </thead>
            <tbody>
              {customer.invoices.map((i) => (
                <tr key={i.invoiceId} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{i.invoiceNo}</td>
                  <td className="px-3 py-2">{formatDate(i.invoiceDate)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {i.dueDate ? formatDate(i.dueDate) : 'No terms given'}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${i.daysOverdue > 90 ? 'text-danger' : ''}`}>
                    {i.daysOverdue > 0 ? i.daysOverdue : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{formatINR(i.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
