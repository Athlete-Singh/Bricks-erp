'use client';

import { FileText, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatINR, PERMISSIONS, todayISO } from '@brics/shared';
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
import type { CreditNote, DebitNote } from '@/features/sales/api';
import {
  useCreateCreditNote,
  useCreateDebitNote,
  useCreditNotes,
  useDebitNotes,
  useInvoices,
} from '@/features/sales/hooks';

interface NoteLine {
  itemId: string;
  warehouseId: string;
  quantity: string;
  rate: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
}
const emptyLine = (): NoteLine => ({
  itemId: '',
  warehouseId: '',
  quantity: '',
  rate: '',
  cgstRate: '',
  sgstRate: '',
  igstRate: '',
});

type NoteKind = 'credit' | 'debit';

function NewNoteDialog({ kind, open, onClose }: { kind: NoteKind; open: boolean; onClose: () => void }) {
  const credit = useCreateCreditNote();
  const debit = useCreateDebitNote();
  const mutation = kind === 'credit' ? credit : debit;

  const { sites } = useSession();
  const { data: customers } = useParties({ limit: 100, type: 'customer' });
  const { data: items } = useItems({ limit: 100, isActive: 'true' });
  const { data: warehouses } = useWarehouses({ limit: 100 });

  const [customerPartyId, setCustomerPartyId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [noteDate, setNoteDate] = useState(todayISO());
  const [invoiceId, setInvoiceId] = useState('');
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<NoteLine[]>([emptyLine()]);
  const { data: invoices } = useInvoices({ customerPartyId: customerPartyId || undefined, limit: 50 });

  const close = () => {
    mutation.reset();
    setCustomerPartyId('');
    setSiteId('');
    setNoteDate(todayISO());
    setInvoiceId('');
    setReason('');
    setLines([emptyLine()]);
    onClose();
  };

  const usable = lines.filter((l) => l.itemId && l.rate);
  const update = (i: number, patch: Partial<NoteLine>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      customerPartyId,
      siteId,
      invoiceId: invoiceId || null,
      noteDate,
      reason,
      lines: usable.map((l) => ({
        itemId: l.itemId,
        warehouseId: l.warehouseId || null,
        quantity: l.quantity ? l.quantity : null,
        rate: l.rate,
        cgstRate: l.cgstRate || '0',
        sgstRate: l.sgstRate || '0',
        igstRate: l.igstRate || '0',
      })),
    };
    if (kind === 'credit') {
      credit.mutate(payload, { onSuccess: close });
    } else {
      // Debit notes have no warehouse per line.
      debit.mutate(
        {
          customerPartyId,
          siteId,
          invoiceId: invoiceId || null,
          noteDate,
          reason,
          lines: usable.map((l) => ({
            itemId: l.itemId,
            quantity: l.quantity ? l.quantity : null,
            rate: l.rate,
            cgstRate: l.cgstRate || '0',
            sgstRate: l.sgstRate || '0',
            igstRate: l.igstRate || '0',
          })),
        },
        { onSuccess: close },
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={kind === 'credit' ? 'New credit note' : 'New debit note'}
      description={
        kind === 'credit'
          ? 'Credits the customer — if quantity is set, bricks come back and stock is restored'
          : 'Debits the customer — raises what they still owe'
      }
    >
      <form id="note-form" onSubmit={submit} className="flex flex-col gap-4">
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
              label="Dated *"
              type="date"
              required
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
            />
            <Select label="Against invoice (optional)" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
              <option value="">Not linked</option>
              {invoices?.items.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNo} — {formatINR(inv.totalAmount)}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">Reason *</span>
            <textarea
              className="min-h-[72px] rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              required
              minLength={5}
              maxLength={500}
              placeholder="Say why this note is being issued"
            />
          </label>

          <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">
              {kind === 'credit' ? 'Lines — leave Qty blank for a value-only credit (price adjustment)' : 'Lines'}
            </legend>
            {lines.map((line, i) => (
              <div
                key={i}
                className={
                  kind === 'credit'
                    ? 'grid gap-2 sm:grid-cols-[minmax(110px,1fr)_minmax(110px,auto)_minmax(60px,auto)_minmax(70px,auto)_minmax(50px,auto)_minmax(50px,auto)_minmax(50px,auto)_auto]'
                    : 'grid gap-2 sm:grid-cols-[minmax(110px,1fr)_minmax(60px,auto)_minmax(70px,auto)_minmax(50px,auto)_minmax(50px,auto)_minmax(50px,auto)_auto]'
                }
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
                {kind === 'credit' && (
                  <Select
                    label={i === 0 ? 'Yard' : undefined}
                    value={line.warehouseId}
                    onChange={(e) => update(i, { warehouseId: e.target.value })}
                  >
                    <option value="">Value only</option>
                    {warehouses?.items.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </Select>
                )}
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
                Add line
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
          form="note-form"
          disabled={
            mutation.isPending || usable.length === 0 || !customerPartyId || !siteId || reason.trim().length < 5
          }
        >
          {mutation.isPending ? 'Posting…' : kind === 'credit' ? 'Issue credit note' : 'Issue debit note'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/** SAL-06 — credit + debit notes, one page with two tables. */
export default function NotesPage() {
  const { can, sites } = useSession();
  const canManage = can(PERMISSIONS.SALES_MANAGE);
  const { data: customers } = useParties({ limit: 100, type: 'customer' });
  const [filters, setFilters] = useState<{ page: number; limit: number; customerPartyId?: string }>({
    page: 1,
    limit: 25,
  });
  const [kindOpen, setKindOpen] = useState<NoteKind | null>(null);

  const credits = useCreditNotes(filters);
  const debits = useDebitNotes(filters);
  const set = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const customerName = (id: string) => customers?.items.find((c) => c.id === id)?.name ?? '—';
  const siteName = (id: string) => sites.find((s) => s.id === id)?.name ?? '—';

  const creditCols: Column<CreditNote>[] = [
    { key: 'no', header: 'Note', render: (n) => <span className="font-medium">{n.noteNo}</span> },
    { key: 'customer', header: 'Customer', render: (n) => customerName(n.customerPartyId) },
    { key: 'site', header: 'Kiln', hideOnMobile: true, render: (n) => siteName(n.siteId) },
    { key: 'date', header: 'Dated', render: (n) => formatDate(n.noteDate) },
    { key: 'total', header: 'Total', render: (n) => <span className="tabular-nums">{formatINR(n.totalAmount)}</span> },
    {
      key: 'stock',
      header: 'Stock',
      render: (n) =>
        n.restocked ? <Badge variant="success">Re-stocked</Badge> : <Badge variant="muted">Value only</Badge>,
    },
    { key: 'reason', header: 'Reason', hideOnMobile: true, render: (n) => n.reason },
  ];
  const debitCols: Column<DebitNote>[] = [
    { key: 'no', header: 'Note', render: (n) => <span className="font-medium">{n.noteNo}</span> },
    { key: 'customer', header: 'Customer', render: (n) => customerName(n.customerPartyId) },
    { key: 'site', header: 'Kiln', hideOnMobile: true, render: (n) => siteName(n.siteId) },
    { key: 'date', header: 'Dated', render: (n) => formatDate(n.noteDate) },
    { key: 'total', header: 'Total', render: (n) => <span className="tabular-nums">{formatINR(n.totalAmount)}</span> },
    { key: 'reason', header: 'Reason', hideOnMobile: true, render: (n) => n.reason },
  ];

  return (
    <div className="flex flex-col gap-6">
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
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setKindOpen('credit')}>
              <Plus className="h-4 w-4" aria-hidden /> New credit note
            </Button>
            <Button size="sm" variant="outline" onClick={() => setKindOpen('debit')}>
              <Plus className="h-4 w-4" aria-hidden /> New debit note
            </Button>
          </div>
        )}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-foreground">Credit notes</h2>
        {credits.isError && <Alert variant="error">{messageOf(credits.error, 'Could not load credit notes')}</Alert>}
        <DataTable
          caption="Credit notes"
          columns={creditCols}
          rows={credits.data?.items ?? []}
          rowKey={(n) => n.id}
          isLoading={credits.isLoading}
          empty={
            <EmptyState icon={FileText} title="No credit notes" description="Issue one when you refund a customer." />
          }
        />
        {credits.data && (
          <Pagination
            meta={credits.data.meta}
            isFetching={credits.isFetching}
            onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
          />
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-foreground">Debit notes</h2>
        {debits.isError && <Alert variant="error">{messageOf(debits.error, 'Could not load debit notes')}</Alert>}
        <DataTable
          caption="Debit notes"
          columns={debitCols}
          rows={debits.data?.items ?? []}
          rowKey={(n) => n.id}
          isLoading={debits.isLoading}
          empty={
            <EmptyState
              icon={FileText}
              title="No debit notes"
              description="Raise one if the customer owes more than invoiced."
            />
          }
        />
      </section>

      {kindOpen && <NewNoteDialog kind={kindOpen} open={kindOpen !== null} onClose={() => setKindOpen(null)} />}
    </div>
  );
}
