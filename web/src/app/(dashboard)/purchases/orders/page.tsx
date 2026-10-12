'use client';

import { ClipboardList, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatDate, PERMISSIONS, PURCHASE_ORDER_STATUSES, todayISO } from '@brics/shared';
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
import type { PurchaseOrder } from '@/features/purchases/api';
import { useCreateOrder, useOrders } from '@/features/purchases/hooks';

const STATUS_TONE: Record<string, 'default' | 'success' | 'warning' | 'muted'> = {
  open: 'muted',
  partial: 'warning',
  received: 'success',
  cancelled: 'default',
};

interface OrderLine {
  itemId: string;
  quantity: string;
  rate: string;
}

function NewOrderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useCreateOrder();
  const { sites } = useSession();
  const { data: suppliers } = useParties({ limit: 100, type: 'supplier' });
  const { data: items } = useItems({ limit: 100, isActive: 'true' });

  const [supplierPartyId, setSupplierPartyId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [orderDate, setOrderDate] = useState(todayISO());
  const [expectedDate, setExpectedDate] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([{ itemId: '', quantity: '', rate: '' }]);

  const close = () => {
    mutation.reset();
    setSupplierPartyId('');
    setSiteId('');
    setOrderDate(todayISO());
    setExpectedDate('');
    setLines([{ itemId: '', quantity: '', rate: '' }]);
    onClose();
  };

  const usable = lines.filter((l) => l.itemId && l.quantity && l.rate);
  const update = (i: number, patch: Partial<OrderLine>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <Dialog open={open} onClose={close} title="New purchase order" description="What you intend to buy, and from whom">
      <form
        id="po-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(
            {
              supplierPartyId,
              siteId,
              orderDate,
              expectedDate: expectedDate || null,
              lines: usable,
            },
            { onSuccess: close },
          );
        }}
        className="flex flex-col gap-4"
      >
        <fieldset disabled={mutation.isPending} className="flex flex-col gap-4 border-0 p-0">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              id="po-supplier"
              label="Supplier *"
              value={supplierPartyId}
              required
              onChange={(e) => setSupplierPartyId(e.target.value)}
            >
              <option value="">Select a supplier…</option>
              {suppliers?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Select id="po-site" label="Kiln *" value={siteId} required onChange={(e) => setSiteId(e.target.value)}>
              <option value="">Select a kiln…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Input
              id="po-date"
              label="Ordered on *"
              type="date"
              required
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
            <Input
              id="po-expected"
              label="Expected"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>

          <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">What you are ordering</legend>
            {lines.map((line, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                <Select
                  id={`po-item-${i}`}
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
                  id={`po-qty-${i}`}
                  label={i === 0 ? 'Quantity' : undefined}
                  inputMode="decimal"
                  value={line.quantity}
                  onChange={(e) => update(i, { quantity: e.target.value })}
                />
                <Input
                  id={`po-rate-${i}`}
                  label={i === 0 ? 'Rate' : undefined}
                  inputMode="decimal"
                  value={line.rate}
                  onChange={(e) => update(i, { rate: e.target.value })}
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setLines([...lines, { itemId: '', quantity: '', rate: '' }])}
              >
                Add item
              </Button>
            </div>
          </fieldset>

          <p className="text-xs text-muted-foreground">
            An order moves no stock and posts nothing — it records what was agreed.
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
          form="po-form"
          disabled={mutation.isPending || usable.length === 0 || !supplierPartyId || !siteId}
        >
          {mutation.isPending ? 'Saving…' : 'Raise order'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/** PUR-01 — purchase orders. */
export default function PurchaseOrdersPage() {
  const { can, sites } = useSession();
  const canManage = can(PERMISSIONS.PURCHASES_MANAGE);
  const { data: suppliers } = useParties({ limit: 100, type: 'supplier' });

  const [filters, setFilters] = useState<{ page: number; limit: number; status?: string; supplierPartyId?: string }>({
    page: 1,
    limit: 25,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, isFetching, isError, error } = useOrders(filters);

  const set = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const supplierName = (id: string) => suppliers?.items.find((s) => s.id === id)?.name ?? '—';
  const siteName = (id: string) => sites.find((s) => s.id === id)?.name ?? '—';

  const columns: Column<PurchaseOrder>[] = [
    { key: 'no', header: 'Order', render: (o) => <span className="font-medium">{o.orderNo}</span> },
    { key: 'supplier', header: 'Supplier', render: (o) => supplierName(o.supplierPartyId) },
    { key: 'site', header: 'Kiln', hideOnMobile: true, render: (o) => siteName(o.siteId) },
    { key: 'date', header: 'Ordered', render: (o) => formatDate(o.orderDate) },
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
            label="Supplier"
            value={filters.supplierPartyId ?? ''}
            onChange={(e) => set({ supplierPartyId: e.target.value || undefined })}
          >
            <option value="">All suppliers</option>
            {suppliers?.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            value={filters.status ?? ''}
            onChange={(e) => set({ status: e.target.value || undefined })}
          >
            <option value="">All statuses</option>
            {PURCHASE_ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden /> New order
          </Button>
        )}
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load the orders')}</Alert>}

      <DataTable
        caption="Purchase orders"
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(o) => o.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={ClipboardList}
            title="No purchase orders"
            description="Raise one when you agree a purchase."
          />
        }
      />

      {data && (
        <Pagination
          meta={data.meta}
          isFetching={isFetching}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
        />
      )}

      <NewOrderDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
