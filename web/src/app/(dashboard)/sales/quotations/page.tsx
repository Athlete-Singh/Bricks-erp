'use client';

import { ClipboardList, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatINR, PERMISSIONS, QUOTATION_STATUSES, todayISO } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Pagination } from '@/components/shared/pagination';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { useItems, useParties } from '@/features/masters/hooks';
import type { Quotation } from '@/features/sales/api';
import { useCreateQuotation, useQuotations } from '@/features/sales/hooks';

const STATUS_TONE: Record<string, 'default' | 'success' | 'warning' | 'muted'> = {
  draft: 'muted',
  sent: 'default',
  accepted: 'success',
  rejected: 'warning',
  cancelled: 'default',
  expired: 'warning',
};

interface QuoteLine {
  itemId: string;
  quantity: string;
  rate: string;
  discount: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
}

function emptyLine(): QuoteLine {
  return { itemId: '', quantity: '', rate: '', discount: '', cgstRate: '', sgstRate: '', igstRate: '' };
}

function NewQuotationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useCreateQuotation();
  const { sites } = useSession();
  const { data: customers } = useParties({ limit: 100, type: 'customer' });
  const { data: items } = useItems({ limit: 100, isActive: 'true' });

  const [customerPartyId, setCustomerPartyId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [quoteDate, setQuoteDate] = useState(todayISO());
  const [validUntil, setValidUntil] = useState('');
  const [lines, setLines] = useState<QuoteLine[]>([emptyLine()]);

  const close = () => {
    mutation.reset();
    setCustomerPartyId('');
    setSiteId('');
    setQuoteDate(todayISO());
    setValidUntil('');
    setLines([emptyLine()]);
    onClose();
  };

  const usable = lines.filter((l) => l.itemId && l.quantity && l.rate);
  const update = (i: number, patch: Partial<QuoteLine>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <Dialog open={open} onClose={close} title="New quotation" description="What you are offering to sell">
      <form
        id="quote-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(
            {
              customerPartyId,
              siteId,
              quoteDate,
              validUntil: validUntil || null,
              lines: usable.map((l) => ({
                itemId: l.itemId,
                quantity: l.quantity,
                rate: l.rate,
                discount: l.discount || '0',
                cgstRate: l.cgstRate || '0',
                sgstRate: l.sgstRate || '0',
                igstRate: l.igstRate || '0',
              })),
              charges: [],
            },
            { onSuccess: close },
          );
        }}
        className="flex flex-col gap-4"
      >
        <fieldset disabled={mutation.isPending} className="flex flex-col gap-4 border-0 p-0">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Customer *"
              value={customerPartyId}
              required
              onChange={(e) => setCustomerPartyId(e.target.value)}
            >
              <option value="">Select a customer…</option>
              {customers?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Select label="Kiln *" value={siteId} required onChange={(e) => setSiteId(e.target.value)}>
              <option value="">Select a kiln…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Input
              label="Quoted on *"
              type="date"
              required
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
            />
            <Input label="Valid until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>

          <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">
              What you are quoting (CGST + SGST intra-state, IGST inter-state — never both)
            </legend>
            {lines.map((line, i) => (
              <div
                key={i}
                className="grid gap-2 sm:grid-cols-[minmax(120px,1fr)_minmax(60px,auto)_minmax(70px,auto)_minmax(60px,auto)_minmax(50px,auto)_minmax(50px,auto)_minmax(50px,auto)_auto]"
              >
                <Select
                  label={i === 0 ? 'Item' : undefined}
                  value={line.itemId}
                  onChange={(e) => update(i, { itemId: e.target.value })}
                >
                  <option value="">Select…</option>
                  {items?.items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label={i === 0 ? 'Qty' : undefined}
                  inputMode="decimal"
                  value={line.quantity}
                  onChange={(e) => update(i, { quantity: e.target.value })}
                />
                <Input
                  label={i === 0 ? 'Rate' : undefined}
                  inputMode="decimal"
                  value={line.rate}
                  onChange={(e) => update(i, { rate: e.target.value })}
                />
                <Input
                  label={i === 0 ? 'Discount' : undefined}
                  inputMode="decimal"
                  value={line.discount}
                  onChange={(e) => update(i, { discount: e.target.value })}
                />
                <Input
                  label={i === 0 ? 'CGST %' : undefined}
                  inputMode="decimal"
                  value={line.cgstRate}
                  onChange={(e) => update(i, { cgstRate: e.target.value })}
                />
                <Input
                  label={i === 0 ? 'SGST %' : undefined}
                  inputMode="decimal"
                  value={line.sgstRate}
                  onChange={(e) => update(i, { sgstRate: e.target.value })}
                />
                <Input
                  label={i === 0 ? 'IGST %' : undefined}
                  inputMode="decimal"
                  value={line.igstRate}
                  onChange={(e) => update(i, { igstRate: e.target.value })}
                />
                <div className="flex items-end pb-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={lines.length === 1}
                    onClick={() => setLines(lines.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <div>
              <Button type="button" size="sm" variant="outline" onClick={() => setLines([...lines, emptyLine()])}>
                Add item
              </Button>
            </div>
          </fieldset>

          <p className="text-xs text-muted-foreground">
            A quote moves no stock and posts no journal — it records what was offered.
          </p>
        </fieldset>

        {mutation.isError && <Alert variant="error">{messageOf(mutation.error)}</Alert>}
      </form>

      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="quote-form"
          disabled={mutation.isPending || usable.length === 0 || !customerPartyId || !siteId}
        >
          {mutation.isPending ? 'Saving…' : 'Raise quote'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/** SAL-01 — quotations. */
export default function QuotationsPage() {
  const { can, sites } = useSession();
  const canManage = can(PERMISSIONS.SALES_MANAGE);
  const { data: customers } = useParties({ limit: 100, type: 'customer' });

  const [filters, setFilters] = useState<{ page: number; limit: number; status?: string; customerPartyId?: string }>({
    page: 1,
    limit: 25,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, isFetching, isError, error } = useQuotations(filters);

  const set = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const customerName = (id: string) => customers?.items.find((c) => c.id === id)?.name ?? '—';
  const siteName = (id: string) => sites.find((s) => s.id === id)?.name ?? '—';

  const columns: Column<Quotation>[] = [
    { key: 'no', header: 'Quote', render: (q) => <span className="font-medium">{q.quoteNo}</span> },
    { key: 'customer', header: 'Customer', render: (q) => customerName(q.customerPartyId) },
    { key: 'site', header: 'Kiln', hideOnMobile: true, render: (q) => siteName(q.siteId) },
    { key: 'date', header: 'Quoted', render: (q) => formatDate(q.quoteDate) },
    { key: 'total', header: 'Total', render: (q) => <span className="tabular-nums">{formatINR(q.totalAmount)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (q) => <Badge variant={STATUS_TONE[q.status] ?? 'muted'}>{q.status}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <Select
            label="Customer"
            value={filters.customerPartyId ?? ''}
            onChange={(e) => set({ customerPartyId: e.target.value || undefined })}
          >
            <option value="">All customers</option>
            {customers?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            value={filters.status ?? ''}
            onChange={(e) => set({ status: e.target.value || undefined })}
          >
            <option value="">All statuses</option>
            {QUOTATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden /> New quotation
          </Button>
        )}
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load the quotations')}</Alert>}

      <DataTable
        caption="Quotations"
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(q) => q.id}
        isLoading={isLoading}
        empty={
          <EmptyState icon={ClipboardList} title="No quotations yet" description="Raise one when you offer a price." />
        }
      />

      {data && (
        <Pagination
          meta={data.meta}
          isFetching={isFetching}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
        />
      )}

      <NewQuotationDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
