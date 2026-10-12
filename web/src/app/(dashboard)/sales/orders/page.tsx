'use client';

import { ClipboardList, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatINR, PERMISSIONS, SALES_ORDER_STATUSES, todayISO } from '@brics/shared';
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
import type { SalesOrder } from '@/features/sales/api';
import { useCreateSalesOrder, useQuotations, useSalesOrders } from '@/features/sales/hooks';

const STATUS_TONE: Record<string, 'default' | 'success' | 'warning' | 'muted'> = {
  open: 'muted',
  partial: 'warning',
  invoiced: 'success',
  cancelled: 'default',
};

interface Line {
  itemId: string;
  quantity: string;
  rate: string;
  discount: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
}
const empty = (): Line => ({
  itemId: '',
  quantity: '',
  rate: '',
  discount: '',
  cgstRate: '',
  sgstRate: '',
  igstRate: '',
});

function NewSalesOrderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useCreateSalesOrder();
  const { sites } = useSession();
  const { data: customers } = useParties({ limit: 100, type: 'customer' });
  const { data: items } = useItems({ limit: 100, isActive: 'true' });
  const [customerPartyId, setCustomerPartyId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [orderDate, setOrderDate] = useState(todayISO());
  const [expectedDate, setExpectedDate] = useState('');
  const [quotationId, setQuotationId] = useState('');
  const [lines, setLines] = useState<Line[]>([empty()]);

  const { data: quotes } = useQuotations({ customerPartyId: customerPartyId || undefined, status: 'accepted' });

  const close = () => {
    mutation.reset();
    setCustomerPartyId('');
    setSiteId('');
    setOrderDate(todayISO());
    setExpectedDate('');
    setQuotationId('');
    setLines([empty()]);
    onClose();
  };

  const usable = lines.filter((l) => l.itemId && l.quantity && l.rate);
  const update = (i: number, patch: Partial<Line>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <Dialog open={open} onClose={close} title="New sales order" description="A confirmed order to supply bricks">
      <form
        id="so-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(
            {
              customerPartyId,
              siteId,
              quotationId: quotationId || null,
              orderDate,
              expectedDate: expectedDate || null,
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
              <option value="">Select…</option>
              {customers?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Select label="Kiln *" value={siteId} required onChange={(e) => setSiteId(e.target.value)}>
              <option value="">Select…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Input
              label="Ordered on *"
              type="date"
              required
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
            <Input
              label="Expected"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
            <Select
              label="From a quote (optional)"
              value={quotationId}
              onChange={(e) => setQuotationId(e.target.value)}
            >
              <option value="">Not linked</option>
              {quotes?.items.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quoteNo} — {formatINR(q.totalAmount)}
                </option>
              ))}
            </Select>
          </div>

          <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">What is being ordered</legend>
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
              <Button type="button" size="sm" variant="outline" onClick={() => setLines([...lines, empty()])}>
                Add item
              </Button>
            </div>
          </fieldset>

          <p className="text-xs text-muted-foreground">A sales order moves no stock — the invoice does.</p>
        </fieldset>

        {mutation.isError && <Alert variant="error">{messageOf(mutation.error)}</Alert>}
      </form>

      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="so-form"
          disabled={mutation.isPending || usable.length === 0 || !customerPartyId || !siteId}
        >
          {mutation.isPending ? 'Saving…' : 'Confirm order'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/** SAL-02 — sales orders. */
export default function SalesOrdersPage() {
  const { can, sites } = useSession();
  const canManage = can(PERMISSIONS.SALES_MANAGE);
  const { data: customers } = useParties({ limit: 100, type: 'customer' });
  const [filters, setFilters] = useState<{ page: number; limit: number; status?: string; customerPartyId?: string }>({
    page: 1,
    limit: 25,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, isFetching, isError, error } = useSalesOrders(filters);

  const set = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const customerName = (id: string) => customers?.items.find((c) => c.id === id)?.name ?? '—';
  const siteName = (id: string) => sites.find((s) => s.id === id)?.name ?? '—';

  const columns: Column<SalesOrder>[] = [
    { key: 'no', header: 'Order', render: (o) => <span className="font-medium">{o.orderNo}</span> },
    { key: 'customer', header: 'Customer', render: (o) => customerName(o.customerPartyId) },
    { key: 'site', header: 'Kiln', hideOnMobile: true, render: (o) => siteName(o.siteId) },
    { key: 'date', header: 'Ordered', render: (o) => formatDate(o.orderDate) },
    { key: 'total', header: 'Total', render: (o) => <span className="tabular-nums">{formatINR(o.totalAmount)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (o) => <Badge variant={STATUS_TONE[o.status] ?? 'muted'}>{o.status}</Badge>,
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
            {SALES_ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden /> New sales order
          </Button>
        )}
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load the orders')}</Alert>}
      <DataTable
        caption="Sales orders"
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(o) => o.id}
        isLoading={isLoading}
        empty={
          <EmptyState icon={ClipboardList} title="No sales orders" description="Confirm one from an accepted quote." />
        }
      />
      {data && (
        <Pagination
          meta={data.meta}
          isFetching={isFetching}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
        />
      )}
      <NewSalesOrderDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
