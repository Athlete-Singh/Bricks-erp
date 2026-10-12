'use client';

import { FileText, Plus, Truck } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS, formatDate, todayISO } from '@brics/shared';
import type { DispatchStatus } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/shared/data-table';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { useItems, useParties, useVehicles, useDrivers, useWarehouses } from '@/features/masters/hooks';
import { fetchChallanPdfObjectUrl, type Dispatch } from '@/features/dispatch/api';
import {
  useAcknowledgeDelivery,
  useCancelDispatch,
  useConfirmDispatch,
  useCreateDispatch,
  useDispatches,
} from '@/features/dispatch/hooks';

const STATUS_TONE: Record<DispatchStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  draft: 'warning',
  confirmed: 'default',
  delivered: 'success',
  cancelled: 'danger',
};

interface LineDraft {
  itemId: string;
  warehouseId: string;
  quantity: string;
}

/** DSP-01…03, DSP-05 — the challan register and everything you do to a challan. */
export default function ChallansPage() {
  const { can, sites } = useSession();
  const [status, setStatus] = useState<DispatchStatus | ''>('');
  const [newOpen, setNewOpen] = useState(false);
  const [acknowledging, setAcknowledging] = useState<Dispatch | null>(null);
  const [cancelling, setCancelling] = useState<Dispatch | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useDispatches({ limit: 50, status: status || undefined });
  const { data: customers } = useParties({ limit: 100, type: 'customer' });
  const { data: vehicles } = useVehicles({ limit: 100 });
  const { data: drivers } = useDrivers({ limit: 100 });
  const { data: items } = useItems({ limit: 100 });
  const { data: warehouses } = useWarehouses({ limit: 100 });

  const create = useCreateDispatch();
  const confirm = useConfirmDispatch();
  const acknowledge = useAcknowledgeDelivery();
  const cancel = useCancelDispatch();

  const canManage = can(PERMISSIONS.DISPATCH_MANAGE);
  const canAcknowledge = can(PERMISSIONS.DISPATCH_ACKNOWLEDGE);

  const [form, setForm] = useState({
    siteId: '',
    customerPartyId: '',
    vehicleId: '',
    driverId: '',
    dispatchDate: todayISO(),
    deliveryLocation: '',
  });
  const [lines, setLines] = useState<LineDraft[]>([{ itemId: '', warehouseId: '', quantity: '' }]);

  const [ack, setAck] = useState({ receivedBy: '', deliveredOn: todayISO(), deliveryRemarks: '' });
  const [cancelReason, setCancelReason] = useState('');

  if (!can(PERMISSIONS.DISPATCH_VIEW)) {
    return <Alert variant="info">You do not have access to dispatch.</Alert>;
  }

  const openPdf = async (id: string) => {
    const url = await fetchChallanPdfObjectUrl(id);
    window.open(url, '_blank', 'noopener');
    // The tab has the bytes by now; holding the URL longer only leaks memory.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const submitNew = async () => {
    setFormError(null);
    try {
      await create.mutateAsync({
        siteId: form.siteId,
        customerPartyId: form.customerPartyId,
        vehicleId: form.vehicleId || null,
        driverId: form.driverId || null,
        dispatchDate: form.dispatchDate,
        deliveryLocation: form.deliveryLocation || null,
        lines: lines
          .filter((l) => l.itemId && l.warehouseId && l.quantity)
          .map((l) => ({ itemId: l.itemId, warehouseId: l.warehouseId, quantity: l.quantity })),
      });
      setNewOpen(false);
      setLines([{ itemId: '', warehouseId: '', quantity: '' }]);
    } catch (error) {
      setFormError(messageOf(error));
    }
  };

  const columns: Column<Dispatch>[] = [
    { key: 'no', header: 'Challan', render: (d) => <span className="font-medium">{d.challanNo}</span> },
    { key: 'date', header: 'Date', render: (d) => formatDate(d.dispatchDate) },
    {
      key: 'customer',
      header: 'Customer',
      render: (d) => customers?.items.find((c) => c.id === d.customerPartyId)?.name ?? '—',
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      hideOnMobile: true,
      render: (d) => vehicles?.items.find((v) => v.id === d.vehicleId)?.registrationNo ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={STATUS_TONE[d.status]}>{d.status}</Badge>
          {d.status !== 'draft' && d.status !== 'cancelled' && (
            // Which document emptied the yard is the one thing a reader cannot
            // infer from the challan alone (ADR-041).
            <Badge variant="muted">{d.movedStock ? 'stock out here' : 'stock out on invoice'}</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (d) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => void openPdf(d.id)}>
            <FileText className="h-4 w-4" aria-hidden /> PDF
          </Button>
          {d.status === 'draft' && canManage && (
            <>
              <Button size="sm" onClick={() => confirm.mutate({ id: d.id })} disabled={confirm.isPending}>
                Confirm out
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCancelling(d)}>
                Cancel
              </Button>
            </>
          )}
          {d.status === 'confirmed' && canAcknowledge && (
            <Button size="sm" variant="outline" onClick={() => setAcknowledging(d)}>
              Record delivery
            </Button>
          )}
          {d.status === 'delivered' && <span className="text-xs text-muted-foreground">{d.receivedBy}</span>}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as DispatchStatus | '')}
          className="max-w-[12rem]"
        >
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        {canManage && (
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden /> New challan
          </Button>
        )}
      </div>

      {confirm.isError && <Alert variant="error">{messageOf(confirm.error)}</Alert>}
      {acknowledge.isError && <Alert variant="error">{messageOf(acknowledge.error)}</Alert>}
      {cancel.isError && <Alert variant="error">{messageOf(cancel.error)}</Alert>}

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(d) => d.id}
        isLoading={isLoading}
        caption="Delivery challans"
        empty={
          <EmptyState
            icon={Truck}
            title="No challans yet"
            description="Raise one when a truck is being loaded. Stock leaves the yard when you confirm it out of the gate."
          />
        }
      />

      <Dialog open={newOpen} onClose={() => setNewOpen(false)} title="New delivery challan">
        <div className="flex flex-col gap-3">
          {formError && <Alert variant="error">{formError}</Alert>}
          <Select
            label="Kiln"
            value={form.siteId}
            onChange={(e) => setForm((f) => ({ ...f, siteId: e.target.value }))}
            required
          >
            <option value="">Select</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select
            label="Customer"
            value={form.customerPartyId}
            onChange={(e) => setForm((f) => ({ ...f, customerPartyId: e.target.value }))}
            required
          >
            <option value="">Select</option>
            {customers?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Vehicle"
              value={form.vehicleId}
              onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
            >
              <option value="">Not recorded</option>
              {vehicles?.items.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNo}
                </option>
              ))}
            </Select>
            <Select
              label="Driver"
              value={form.driverId}
              onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}
            >
              <option value="">Not recorded</option>
              {drivers?.items.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Date"
              type="date"
              value={form.dispatchDate}
              onChange={(e) => setForm((f) => ({ ...f, dispatchDate: e.target.value }))}
            />
            <Input
              label="Deliver to"
              value={form.deliveryLocation}
              onChange={(e) => setForm((f) => ({ ...f, deliveryLocation: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">What is on the truck</span>
            {lines.map((line, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_8rem]">
                <Select
                  label="Grade"
                  value={line.itemId}
                  onChange={(e) =>
                    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, itemId: e.target.value } : l)))
                  }
                >
                  <option value="">Select</option>
                  {items?.items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="From yard"
                  value={line.warehouseId}
                  onChange={(e) =>
                    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, warehouseId: e.target.value } : l)))
                  }
                >
                  <option value="">Select</option>
                  {warehouses?.items.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Quantity"
                  inputMode="numeric"
                  value={line.quantity}
                  onChange={(e) =>
                    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, quantity: e.target.value } : l)))
                  }
                />
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLines((ls) => [...ls, { itemId: '', warehouseId: '', quantity: '' }])}
            >
              <Plus className="h-4 w-4" aria-hidden /> Add a grade
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Saving raises a draft. Stock leaves the yard when you confirm the truck out of the gate — and not at all if
            the load is already on an invoice, because the invoice took it.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNewOpen(false)}>
              Close
            </Button>
            <Button onClick={() => void submitNew()} disabled={create.isPending}>
              Raise challan
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={acknowledging !== null}
        onClose={() => setAcknowledging(null)}
        title={`Delivery for ${acknowledging?.challanNo ?? ''}`}
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Received by"
            value={ack.receivedBy}
            onChange={(e) => setAck((a) => ({ ...a, receivedBy: e.target.value }))}
            required
          />
          <Input
            label="Received on"
            type="date"
            value={ack.deliveredOn}
            onChange={(e) => setAck((a) => ({ ...a, deliveredOn: e.target.value }))}
          />
          <Input
            label="Remarks"
            value={ack.deliveryRemarks}
            onChange={(e) => setAck((a) => ({ ...a, deliveryRemarks: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAcknowledging(null)}>
              Close
            </Button>
            <Button
              onClick={async () => {
                if (!acknowledging) return;
                await acknowledge.mutateAsync({ id: acknowledging.id, ...ack });
                setAcknowledging(null);
              }}
              disabled={acknowledge.isPending || ack.receivedBy.trim() === ''}
            >
              Record delivery
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        title={`Cancel ${cancelling?.challanNo ?? ''}`}
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Why"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">At least 10 characters — this stays on the record.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelling(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!cancelling) return;
                await cancel.mutateAsync({ id: cancelling.id, reason: cancelReason });
                setCancelling(null);
                setCancelReason('');
              }}
              disabled={cancel.isPending || cancelReason.trim().length < 10}
            >
              Cancel challan
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
