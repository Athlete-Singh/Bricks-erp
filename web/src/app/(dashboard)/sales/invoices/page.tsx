'use client';

import { FileText, Plus, Printer, X } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatINR, PERMISSIONS, SALES_INVOICE_STATUSES, todayISO } from '@brics/shared';
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
import { useItems, useParties, useWarehouses } from '@/features/masters/hooks';
import type { SalesInvoice } from '@/features/sales/api';
import { fetchInvoicePdfObjectUrl } from '@/features/sales/api';
import { useCreateInvoice, useInvoices } from '@/features/sales/hooks';

const STATUS_TONE: Record<string, 'default' | 'success' | 'warning' | 'muted'> = {
  open: 'default',
  partial: 'warning',
  paid: 'success',
  cancelled: 'muted',
};

interface InvoiceLine {
  itemId: string;
  warehouseId: string;
  quantity: string;
  rate: string;
  discount: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
  hsnCode: string;
}
const empty = (): InvoiceLine => ({
  itemId: '',
  warehouseId: '',
  quantity: '',
  rate: '',
  discount: '',
  cgstRate: '',
  sgstRate: '',
  igstRate: '',
  hsnCode: '',
});

interface Charge {
  kind: 'loading' | 'transport' | 'other';
  label: string;
  amount: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
}

function NewInvoiceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useCreateInvoice();
  const { sites } = useSession();
  const { data: customers } = useParties({ limit: 100, type: 'customer' });
  const { data: items } = useItems({ limit: 100, isActive: 'true' });
  const { data: warehouses } = useWarehouses({ limit: 100 });

  const [customerPartyId, setCustomerPartyId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState('');
  const [customerPoNo, setCustomerPoNo] = useState('');
  const [lines, setLines] = useState<InvoiceLine[]>([empty()]);
  const [charges, setCharges] = useState<Charge[]>([]);

  const close = () => {
    mutation.reset();
    setCustomerPartyId('');
    setSiteId('');
    setInvoiceDate(todayISO());
    setDueDate('');
    setCustomerPoNo('');
    setLines([empty()]);
    setCharges([]);
    onClose();
  };

  const usable = lines.filter((l) => l.itemId && l.warehouseId && l.quantity && l.rate);
  const update = (i: number, patch: Partial<InvoiceLine>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const updateCharge = (i: number, patch: Partial<Charge>) =>
    setCharges(charges.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  return (
    <Dialog
      open={open}
      onClose={close}
      title="New tax invoice"
      description="Issues the invoice, moves bricks out of the yard, and posts the journal in one transaction"
    >
      <form
        id="inv-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(
            {
              customerPartyId,
              siteId,
              invoiceDate,
              dueDate: dueDate || null,
              customerPoNo: customerPoNo || null,
              lines: usable.map((l) => ({
                itemId: l.itemId,
                warehouseId: l.warehouseId,
                quantity: l.quantity,
                rate: l.rate,
                discount: l.discount || '0',
                cgstRate: l.cgstRate || '0',
                sgstRate: l.sgstRate || '0',
                igstRate: l.igstRate || '0',
                hsnCode: l.hsnCode || null,
              })),
              charges: charges
                .filter((c) => c.label && c.amount)
                .map((c) => ({
                  kind: c.kind,
                  label: c.label,
                  amount: c.amount,
                  cgstRate: c.cgstRate || '0',
                  sgstRate: c.sgstRate || '0',
                  igstRate: c.igstRate || '0',
                })),
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
              label="Invoice date *"
              type="date"
              required
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
            <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <Input
              label="Customer PO (optional)"
              value={customerPoNo}
              onChange={(e) => setCustomerPoNo(e.target.value)}
            />
          </div>

          <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">What is being invoiced</legend>
            {lines.map((line, i) => (
              <div
                key={i}
                className="grid gap-2 sm:grid-cols-[minmax(110px,1fr)_minmax(100px,auto)_minmax(60px,auto)_minmax(70px,auto)_minmax(60px,auto)_minmax(50px,auto)_minmax(50px,auto)_minmax(50px,auto)_minmax(60px,auto)_auto]"
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
                <Select
                  label={i === 0 ? 'Yard' : undefined}
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
                <Input
                  label={i === 0 ? 'HSN' : undefined}
                  value={line.hsnCode}
                  onChange={(e) => update(i, { hsnCode: e.target.value })}
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

          <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">
              Loading, transport and other charges (same GST rate as the brick line — composite supply)
            </legend>
            {charges.length === 0 && <p className="text-xs text-muted-foreground">No extra charges on this invoice.</p>}
            {charges.map((c, i) => (
              <div
                key={i}
                className="grid gap-2 sm:grid-cols-[minmax(100px,auto)_minmax(140px,1fr)_minmax(80px,auto)_minmax(50px,auto)_minmax(50px,auto)_minmax(50px,auto)_auto]"
              >
                <Select
                  label={i === 0 ? 'Kind' : undefined}
                  value={c.kind}
                  onChange={(e) => updateCharge(i, { kind: e.target.value as Charge['kind'] })}
                >
                  <option value="loading">Loading</option>
                  <option value="transport">Transport</option>
                  <option value="other">Other</option>
                </Select>
                <Input
                  label={i === 0 ? 'Label' : undefined}
                  value={c.label}
                  onChange={(e) => updateCharge(i, { label: e.target.value })}
                />
                <Input
                  label={i === 0 ? 'Amount' : undefined}
                  inputMode="decimal"
                  value={c.amount}
                  onChange={(e) => updateCharge(i, { amount: e.target.value })}
                />
                <Input
                  label={i === 0 ? 'CGST %' : undefined}
                  inputMode="decimal"
                  value={c.cgstRate}
                  onChange={(e) => updateCharge(i, { cgstRate: e.target.value })}
                />
                <Input
                  label={i === 0 ? 'SGST %' : undefined}
                  inputMode="decimal"
                  value={c.sgstRate}
                  onChange={(e) => updateCharge(i, { sgstRate: e.target.value })}
                />
                <Input
                  label={i === 0 ? 'IGST %' : undefined}
                  inputMode="decimal"
                  value={c.igstRate}
                  onChange={(e) => updateCharge(i, { igstRate: e.target.value })}
                />
                <div className="flex items-end pb-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setCharges(charges.filter((_, idx) => idx !== i))}
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
                onClick={() =>
                  setCharges([
                    ...charges,
                    { kind: 'loading', label: '', amount: '', cgstRate: '', sgstRate: '', igstRate: '' },
                  ])
                }
              >
                Add charge
              </Button>
            </div>
          </fieldset>
        </fieldset>

        {mutation.isError && <Alert variant="error">{messageOf(mutation.error)}</Alert>}
      </form>

      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="inv-form"
          disabled={mutation.isPending || usable.length === 0 || !customerPartyId || !siteId}
        >
          {mutation.isPending ? 'Posting…' : 'Issue invoice'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/** SAL-03 — tax invoices. */
export default function InvoicesPage() {
  const { can, sites } = useSession();
  const canManage = can(PERMISSIONS.SALES_MANAGE);
  const { data: customers } = useParties({ limit: 100, type: 'customer' });

  const [filters, setFilters] = useState<{
    page: number;
    limit: number;
    status?: string;
    customerPartyId?: string;
    unpaidOnly?: 'true' | 'false';
  }>({ page: 1, limit: 25 });
  const [createOpen, setCreateOpen] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const { data, isLoading, isFetching, isError, error } = useInvoices(filters);

  const set = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const customerName = (id: string) => customers?.items.find((c) => c.id === id)?.name ?? '—';
  const siteName = (id: string) => sites.find((s) => s.id === id)?.name ?? '—';

  const openPdf = async (id: string) => {
    setPdfError(null);
    try {
      const url = await fetchInvoicePdfObjectUrl(id);
      window.open(url, '_blank', 'noopener,noreferrer');
      // Release the memory after a short delay — the new tab has loaded the bytes by then.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Could not open the invoice PDF');
    }
  };

  const columns: Column<SalesInvoice>[] = [
    { key: 'no', header: 'Invoice', render: (i) => <span className="font-medium">{i.invoiceNo}</span> },
    { key: 'customer', header: 'Customer', render: (i) => customerName(i.customerPartyId) },
    { key: 'site', header: 'Kiln', hideOnMobile: true, render: (i) => siteName(i.siteId) },
    { key: 'date', header: 'Dated', render: (i) => formatDate(i.invoiceDate) },
    {
      key: 'total',
      header: 'Total',
      render: (i) => <span className="tabular-nums">{formatINR(i.totalAmount)}</span>,
    },
    {
      key: 'paid',
      header: 'Paid',
      render: (i) => <span className="tabular-nums">{formatINR(i.paidAmount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (i) => <Badge variant={STATUS_TONE[i.status] ?? 'muted'}>{i.status}</Badge>,
    },
    {
      key: 'pdf',
      header: '',
      render: (i) => (
        <Button size="sm" variant="ghost" onClick={() => openPdf(i.id)} aria-label={`Open PDF for ${i.invoiceNo}`}>
          <Printer className="h-4 w-4" aria-hidden /> PDF
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
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
            {SALES_INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            label="Unpaid only?"
            value={filters.unpaidOnly ?? ''}
            onChange={(e) => set({ unpaidOnly: (e.target.value as 'true' | 'false' | '') || undefined })}
          >
            <option value="">All invoices</option>
            <option value="true">Only unpaid</option>
          </Select>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden /> New invoice
          </Button>
        )}
      </div>

      {pdfError && (
        <Alert variant="error">
          <span className="flex items-center gap-2">
            {pdfError}
            <Button size="sm" variant="ghost" onClick={() => setPdfError(null)}>
              <X className="h-3 w-3" aria-hidden />
            </Button>
          </span>
        </Alert>
      )}
      {isError && <Alert variant="error">{messageOf(error, 'Could not load the invoices')}</Alert>}

      <DataTable
        caption="Sales invoices"
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(i) => i.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Issue one to deduct stock and bill the customer."
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

      <NewInvoiceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
