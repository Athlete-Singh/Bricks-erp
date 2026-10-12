'use client';

import { PackageCheck, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatDate, PERMISSIONS, todayISO } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Pagination } from '@/components/shared/pagination';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { useItems, useParties, useWarehouses } from '@/features/masters/hooks';
import type { GoodsReceipt } from '@/features/purchases/api';
import { useCreateReceipt, useOrders, useReceipts } from '@/features/purchases/hooks';

interface ReceiptLine {
  itemId: string;
  warehouseId: string;
  quantity: string;
}

function NewReceiptDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useCreateReceipt();
  const { sites } = useSession();
  const { data: suppliers } = useParties({ limit: 100, type: 'supplier' });
  const { data: items } = useItems({ limit: 100, isActive: 'true' });
  const { data: warehouses } = useWarehouses({ limit: 100, isActive: 'true' });

  const [supplierPartyId, setSupplierPartyId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [receiptDate, setReceiptDate] = useState(todayISO());
  const [challanNo, setChallanNo] = useState('');
  const [lines, setLines] = useState<ReceiptLine[]>([{ itemId: '', warehouseId: '', quantity: '' }]);

  // Only that supplier's open orders can be received against.
  const { data: openOrders } = useOrders(
    supplierPartyId ? { limit: 100, supplierPartyId, status: 'open' } : { limit: 1 },
  );

  const close = () => {
    mutation.reset();
    setSupplierPartyId('');
    setSiteId('');
    setPurchaseOrderId('');
    setReceiptDate(todayISO());
    setChallanNo('');
    setLines([{ itemId: '', warehouseId: '', quantity: '' }]);
    onClose();
  };

  const usable = lines.filter((l) => l.itemId && l.warehouseId && l.quantity);
  const update = (i: number, patch: Partial<ReceiptLine>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Receive goods"
      description="What arrived at the gate. Quantity only — the price comes with the bill."
    >
      <form
        id="grn-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(
            {
              supplierPartyId,
              siteId,
              purchaseOrderId: purchaseOrderId || null,
              receiptDate,
              challanNo: challanNo || null,
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
              id="grn-supplier"
              label="Supplier *"
              value={supplierPartyId}
              required
              onChange={(e) => {
                setSupplierPartyId(e.target.value);
                // An order belongs to one supplier; changing supplier invalidates it.
                setPurchaseOrderId('');
              }}
            >
              <option value="">Select a supplier…</option>
              {suppliers?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Select id="grn-site" label="Kiln *" value={siteId} required onChange={(e) => setSiteId(e.target.value)}>
              <option value="">Select a kiln…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select
              id="grn-order"
              label="Against order"
              value={purchaseOrderId}
              disabled={!supplierPartyId}
              onChange={(e) => setPurchaseOrderId(e.target.value)}
            >
              <option value="">No order</option>
              {openOrders?.items.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNo}
                </option>
              ))}
            </Select>
            <Input
              id="grn-challan"
              label="Challan no."
              value={challanNo}
              placeholder="CH-9001"
              onChange={(e) => setChallanNo(e.target.value)}
            />
            <Input
              id="grn-date"
              label="Received on *"
              type="date"
              required
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
            />
          </div>

          <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">What arrived</legend>
            {lines.map((line, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                <Select
                  id={`grn-item-${i}`}
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
                <Select
                  id={`grn-warehouse-${i}`}
                  label={i === 0 ? 'Into' : undefined}
                  value={line.warehouseId}
                  onChange={(e) => update(i, { warehouseId: e.target.value })}
                >
                  <option value="">Select…</option>
                  {warehouses?.items.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </Select>
                <Input
                  id={`grn-qty-${i}`}
                  label={i === 0 ? 'Quantity' : undefined}
                  inputMode="decimal"
                  value={line.quantity}
                  onChange={(e) => update(i, { quantity: e.target.value })}
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
                onClick={() => setLines([...lines, { itemId: '', warehouseId: '', quantity: '' }])}
              >
                Add item
              </Button>
            </div>
          </fieldset>

          <p className="text-xs text-muted-foreground">Saving this puts the goods into stock straight away.</p>
        </fieldset>

        {mutation.isError && <Alert variant="error">{messageOf(mutation.error)}</Alert>}
      </form>

      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="grn-form"
          disabled={mutation.isPending || usable.length === 0 || !supplierPartyId || !siteId}
        >
          {mutation.isPending ? 'Saving…' : 'Receive goods'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/** PUR-02 — goods receipts. */
export default function GoodsReceiptsPage() {
  const { can } = useSession();
  const canManage = can(PERMISSIONS.PURCHASES_MANAGE);
  const { data: suppliers } = useParties({ limit: 100, type: 'supplier' });

  const [filters, setFilters] = useState<{ page: number; limit: number; supplierPartyId?: string }>({
    page: 1,
    limit: 25,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, isFetching, isError, error } = useReceipts(filters);

  const supplierName = (id: string) => suppliers?.items.find((s) => s.id === id)?.name ?? '—';

  const columns: Column<GoodsReceipt>[] = [
    { key: 'no', header: 'GRN', render: (g) => <span className="font-medium">{g.grnNo}</span> },
    { key: 'supplier', header: 'Supplier', render: (g) => supplierName(g.supplierPartyId) },
    { key: 'date', header: 'Received', render: (g) => formatDate(g.receiptDate) },
    {
      key: 'challan',
      header: 'Challan',
      hideOnMobile: true,
      render: (g) => g.challanNo ?? <span className="text-muted-foreground">—</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Select
          label="Supplier"
          value={filters.supplierPartyId ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, supplierPartyId: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All suppliers</option>
          {suppliers?.items.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden /> Receive goods
          </Button>
        )}
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load the receipts')}</Alert>}

      <DataTable
        caption="Goods receipts"
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(g) => g.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={PackageCheck}
            title="Nothing received yet"
            description="Record a receipt when goods arrive — it puts them into stock."
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

      <NewReceiptDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
