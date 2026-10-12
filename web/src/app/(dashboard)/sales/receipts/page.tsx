'use client';

import { Plus, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatDate, formatINR, PERMISSIONS, SALES_PAYMENT_MODES, todayISO } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Pagination } from '@/components/shared/pagination';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { useLedgers } from '@/features/accounting/hooks';
import { useParties } from '@/features/masters/hooks';
import type { CustomerReceipt } from '@/features/sales/api';
import { useCreateReceipt, useInvoices, useReceipts } from '@/features/sales/hooks';

interface Allocation {
  invoiceId: string;
  invoiceNo: string;
  outstanding: string;
  amount: string;
}

function NewReceiptDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useCreateReceipt();
  const { sites } = useSession();
  const { data: customers } = useParties({ limit: 100, type: 'customer' });
  const { data: ledgers } = useLedgers();

  const [customerPartyId, setCustomerPartyId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [receiptDate, setReceiptDate] = useState(todayISO());
  const [mode, setMode] = useState<(typeof SALES_PAYMENT_MODES)[number]>('cash');
  const [depositToLedgerId, setDepositToLedgerId] = useState('');
  const [reference, setReference] = useState('');
  const [picked, setPicked] = useState<Record<string, string>>({});

  const { data: openInvoices } = useInvoices({
    customerPartyId: customerPartyId || undefined,
    unpaidOnly: 'true',
    limit: 100,
  });

  // Cash & bank ledgers only (asset nature already groups them; filter by name
  // match on the group tree is a next-step improvement when a dedicated endpoint lands).
  const cashBank = useMemo(
    () =>
      (ledgers ?? []).filter(
        (l) =>
          l.code === 'CASH' ||
          l.name.toLowerCase().includes('bank') ||
          l.name.toLowerCase().includes('upi') ||
          l.name.toLowerCase().includes('cash'),
      ),
    [ledgers],
  );

  const allocs: Allocation[] = useMemo(() => {
    return (openInvoices?.items ?? [])
      .map((i) => ({
        invoiceId: i.id,
        invoiceNo: i.invoiceNo,
        outstanding: (Number(i.totalAmount) - Number(i.paidAmount)).toFixed(2),
        amount: picked[i.id] ?? '',
      }))
      .filter((a) => Number(a.outstanding) > 0);
  }, [openInvoices, picked]);

  const sum = allocs.reduce((acc, a) => acc + Number(a.amount || 0), 0);

  const close = () => {
    mutation.reset();
    setCustomerPartyId('');
    setSiteId('');
    setReceiptDate(todayISO());
    setMode('cash');
    setDepositToLedgerId('');
    setReference('');
    setPicked({});
    onClose();
  };

  const toAllocate = allocs
    .filter((a) => Number(a.amount) > 0)
    .map((a) => ({ invoiceId: a.invoiceId, amount: a.amount }));

  return (
    <Dialog
      open={open}
      onClose={close}
      title="New customer receipt"
      description="Allocate the receipt invoice by invoice — unallocated amounts the ageing report cannot place"
    >
      <form
        id="rcpt-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(
            {
              customerPartyId,
              siteId,
              receiptDate,
              mode,
              depositToLedgerId,
              allocations: toAllocate,
              reference: reference || null,
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
              label="Received on *"
              type="date"
              required
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
            />
            <Select
              label="Mode *"
              value={mode}
              onChange={(e) => setMode(e.target.value as (typeof SALES_PAYMENT_MODES)[number])}
            >
              {SALES_PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <Select
              label="Deposited into *"
              value={depositToLedgerId}
              required
              onChange={(e) => setDepositToLedgerId(e.target.value)}
            >
              <option value="">Select a cash or bank ledger…</option>
              {cashBank.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
            <Input
              label="Reference (cheque / UPI txn)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="rounded-md border border-border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {customerPartyId
                ? 'Pick the invoices this receipt settles'
                : 'Select a customer to see their open invoices.'}
            </p>
            {customerPartyId && allocs.length === 0 && (
              <p className="text-xs text-muted-foreground">That customer has nothing outstanding.</p>
            )}
            {allocs.length > 0 && (
              <table className="w-full text-sm">
                <caption className="sr-only">Open invoices for allocation</caption>
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="pb-1 text-left font-medium">Invoice</th>
                    <th className="pb-1 text-right font-medium">Outstanding</th>
                    <th className="pb-1 text-right font-medium">Allocate</th>
                  </tr>
                </thead>
                <tbody>
                  {allocs.map((a) => (
                    <tr key={a.invoiceId} className="border-t border-border">
                      <td className="py-2">{a.invoiceNo}</td>
                      <td className="py-2 text-right tabular-nums">{formatINR(a.outstanding)}</td>
                      <td className="py-2 text-right">
                        <Input
                          aria-label={`Allocate to ${a.invoiceNo}`}
                          inputMode="decimal"
                          value={a.amount}
                          onChange={(e) => setPicked({ ...picked, [a.invoiceId]: e.target.value })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-medium">
                    <td className="pt-2 text-right" colSpan={2}>
                      Total this receipt
                    </td>
                    <td className="pt-2 pr-1 text-right tabular-nums">{formatINR(sum.toFixed(2))}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </fieldset>

        {mutation.isError && <Alert variant="error">{messageOf(mutation.error)}</Alert>}
      </form>

      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="rcpt-form"
          disabled={mutation.isPending || toAllocate.length === 0 || !customerPartyId || !siteId || !depositToLedgerId}
        >
          {mutation.isPending ? 'Posting…' : 'Record receipt'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/** SAL-05 — customer receipts. */
export default function ReceiptsPage() {
  const { can, sites } = useSession();
  const canManage = can(PERMISSIONS.SALES_MANAGE) && can(PERMISSIONS.ACCOUNTS_MANAGE);
  const { data: customers } = useParties({ limit: 100, type: 'customer' });
  const [filters, setFilters] = useState<{ page: number; limit: number; customerPartyId?: string }>({
    page: 1,
    limit: 25,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, isFetching, isError, error } = useReceipts(filters);

  const set = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const customerName = (id: string) => customers?.items.find((c) => c.id === id)?.name ?? '—';
  const siteName = (id: string) => sites.find((s) => s.id === id)?.name ?? '—';

  const columns: Column<CustomerReceipt>[] = [
    { key: 'date', header: 'Received', render: (r) => formatDate(r.receiptDate) },
    { key: 'customer', header: 'Customer', render: (r) => customerName(r.customerPartyId) },
    { key: 'site', header: 'Kiln', hideOnMobile: true, render: (r) => siteName(r.siteId) },
    { key: 'mode', header: 'Mode', render: (r) => r.mode },
    { key: 'amount', header: 'Amount', render: (r) => <span className="tabular-nums">{formatINR(r.amount)}</span> },
    { key: 'ref', header: 'Reference', hideOnMobile: true, render: (r) => r.reference ?? '—' },
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
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden /> New receipt
          </Button>
        )}
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load the receipts')}</Alert>}

      <DataTable
        caption="Customer receipts"
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        empty={<EmptyState icon={Wallet} title="No receipts yet" description="Record one when the money arrives." />}
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
