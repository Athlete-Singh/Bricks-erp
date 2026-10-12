'use client';

import { FileText, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatINR, PERMISSIONS, subtractAmounts, isZeroAmount, todayISO } from '@brics/shared';
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
import type { PurchaseBill } from '@/features/purchases/api';
import { useBills, useCreateBill, useCreatePayment, useCreateReturn, useReceipts } from '@/features/purchases/hooks';
import { useLedgers } from '@/features/accounting/hooks';

interface BillLine {
  itemId: string;
  quantity: string;
  rate: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
}

const blankLine = (): BillLine => ({ itemId: '', quantity: '', rate: '', cgstRate: '', sgstRate: '', igstRate: '' });

function NewBillDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useCreateBill();
  const { sites } = useSession();
  const { data: suppliers } = useParties({ limit: 100, type: 'supplier' });
  const { data: items } = useItems({ limit: 100, isActive: 'true' });

  const [supplierPartyId, setSupplierPartyId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [billDate, setBillDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState('');
  const [grnId, setGrnId] = useState('');
  const [lines, setLines] = useState<BillLine[]>([blankLine()]);

  const { data: receipts } = useReceipts(supplierPartyId ? { limit: 100, supplierPartyId } : { limit: 1 });

  const close = () => {
    mutation.reset();
    setSupplierPartyId('');
    setSiteId('');
    setSupplierInvoiceNo('');
    setBillDate(todayISO());
    setDueDate('');
    setGrnId('');
    setLines([blankLine()]);
    onClose();
  };

  const usable = lines.filter((l) => l.itemId && l.quantity && l.rate);
  const update = (i: number, patch: Partial<BillLine>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  /**
   * Within a state tax splits into CGST + SGST; between states it is IGST. The
   * API refuses both on one line, so the form offers it as one choice.
   */
  const applyTax = (i: number, total: string, interState: boolean) => {
    const half = (Number(total) / 2).toFixed(2);
    update(
      i,
      interState ? { igstRate: total, cgstRate: '', sgstRate: '' } : { cgstRate: half, sgstRate: half, igstRate: '' },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Supplier bill"
      description="The invoice, and where value enters the books"
    >
      <form
        id="bill-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(
            {
              supplierPartyId,
              siteId,
              supplierInvoiceNo,
              billDate,
              dueDate: dueDate || null,
              grnId: grnId || null,
              lines: usable.map((l) => ({
                itemId: l.itemId,
                quantity: l.quantity,
                rate: l.rate,
                cgstRate: l.cgstRate || '0',
                sgstRate: l.sgstRate || '0',
                igstRate: l.igstRate || '0',
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
              id="bill-supplier"
              label="Supplier *"
              value={supplierPartyId}
              required
              onChange={(e) => {
                setSupplierPartyId(e.target.value);
                setGrnId('');
              }}
            >
              <option value="">Select a supplier…</option>
              {suppliers?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Select id="bill-site" label="Kiln *" value={siteId} required onChange={(e) => setSiteId(e.target.value)}>
              <option value="">Select a kiln…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Input
              id="bill-invoice"
              label="Their invoice no. *"
              required
              value={supplierInvoiceNo}
              placeholder="INV-77"
              onChange={(e) => setSupplierInvoiceNo(e.target.value)}
            />
            <Select
              id="bill-grn"
              label="Against receipt"
              value={grnId}
              disabled={!supplierPartyId}
              onChange={(e) => setGrnId(e.target.value)}
            >
              <option value="">No receipt</option>
              {receipts?.items.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.grnNo}
                </option>
              ))}
            </Select>
            <Input
              id="bill-date"
              label="Bill date *"
              type="date"
              required
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
            />
            <Input id="bill-due" label="Due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <fieldset className="flex flex-col gap-3 rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">What you were billed for</legend>
            {lines.map((line, i) => (
              <div key={i} className="flex flex-col gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                  <Select
                    id={`bill-item-${i}`}
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
                    id={`bill-qty-${i}`}
                    label={i === 0 ? 'Quantity' : undefined}
                    inputMode="decimal"
                    value={line.quantity}
                    onChange={(e) => update(i, { quantity: e.target.value })}
                  />
                  <Input
                    id={`bill-rate-${i}`}
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">GST:</span>
                  {['5', '12', '18', '28'].map((rate) => (
                    <Button
                      key={rate}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => applyTax(i, rate, false)}
                    >
                      {rate}% in-state
                    </Button>
                  ))}
                  {['5', '12', '18', '28'].map((rate) => (
                    <Button
                      key={`i${rate}`}
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => applyTax(i, rate, true)}
                    >
                      {rate}% IGST
                    </Button>
                  ))}
                  {(line.cgstRate || line.igstRate) && (
                    <span className="text-xs text-muted-foreground">
                      {line.igstRate ? `IGST ${line.igstRate}%` : `CGST ${line.cgstRate}% + SGST ${line.sgstRate}%`}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div>
              <Button type="button" size="sm" variant="outline" onClick={() => setLines([...lines, blankLine()])}>
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
          form="bill-form"
          disabled={mutation.isPending || usable.length === 0 || !supplierPartyId || !siteId || !supplierInvoiceNo}
        >
          {mutation.isPending ? 'Saving…' : 'Record bill'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function PayDialog({ bill, onClose }: { bill: PurchaseBill | null; onClose: () => void }) {
  const mutation = useCreatePayment();
  const { data: ledgers } = useLedgers();
  const [mode, setMode] = useState<'cash' | 'bank' | 'upi'>('cash');
  const [paidFromLedgerId, setPaidFromLedgerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [reference, setReference] = useState('');

  if (!bill) return null;
  const outstanding = subtractAmounts(bill.totalAmount, bill.paidAmount);

  const close = () => {
    mutation.reset();
    setAmount('');
    setReference('');
    setPaidFromLedgerId('');
    setPaymentDate(todayISO());
    onClose();
  };

  // Cash and bank ledgers only — you cannot pay a supplier out of an expense.
  const payable = ledgers?.filter((l) => l.code === 'CASH' || l.code?.startsWith('BANK')) ?? [];

  return (
    <Dialog
      open
      onClose={close}
      title={`Pay invoice ${bill.supplierInvoiceNo}`}
      description={`${formatINR(outstanding)} outstanding`}
    >
      <form
        id="pay-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(
            {
              supplierPartyId: bill.supplierPartyId,
              siteId: bill.siteId,
              paymentDate,
              mode,
              paidFromLedgerId,
              allocations: [{ billId: bill.id, amount }],
              reference: reference || null,
            },
            { onSuccess: close },
          );
        }}
        className="flex flex-col gap-4"
      >
        <fieldset disabled={mutation.isPending} className="flex flex-col gap-3 border-0 p-0">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="pay-amount"
              label="Amount *"
              inputMode="decimal"
              required
              value={amount}
              placeholder={outstanding}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              id="pay-date"
              label="Paid on *"
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
            <Select id="pay-mode" label="Mode *" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="upi">UPI</option>
            </Select>
            <Select
              id="pay-ledger"
              label="Paid from *"
              value={paidFromLedgerId}
              required
              onChange={(e) => setPaidFromLedgerId(e.target.value)}
            >
              <option value="">Select…</option>
              {payable.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
          <Input
            id="pay-reference"
            label="Reference"
            value={reference}
            placeholder="UTR or cheque number"
            onChange={(e) => setReference(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            A payment is allocated to this bill, so what is still owed stays accurate.
          </p>
        </fieldset>

        {mutation.isError && <Alert variant="error">{messageOf(mutation.error)}</Alert>}
      </form>

      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" form="pay-form" disabled={mutation.isPending || !amount || !paidFromLedgerId}>
          {mutation.isPending ? 'Paying…' : 'Record payment'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/**
 * PUR-05 — goods going back as a debit note.
 *
 * Tied to a bill because that is how it happens: somebody looks at an invoice,
 * decides part of it was wrong, and sends it back. The stock leaves and the
 * supplier is debited in one transaction, so a return of goods already
 * consumed is refused outright rather than driving the yard negative.
 */
function ReturnDialog({ bill, onClose }: { bill: PurchaseBill | null; onClose: () => void }) {
  const mutation = useCreateReturn();
  const { data: items } = useItems({ limit: 100, isActive: 'true' });
  const { data: warehouses } = useWarehouses({ limit: 100, isActive: 'true' });

  const [returnDate, setReturnDate] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [itemId, setItemId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [taxRate, setTaxRate] = useState('');

  if (!bill) return null;

  const close = () => {
    mutation.reset();
    setReturnDate(todayISO());
    setReason('');
    setItemId('');
    setWarehouseId('');
    setQuantity('');
    setRate('');
    setTaxRate('');
    onClose();
  };

  // Mirrors the server's floor, so the button explains itself before the server does.
  const reasonTooShort = reason.trim().length < 5;
  const half = taxRate ? (Number(taxRate) / 2).toFixed(2) : '0';

  return (
    <Dialog
      open
      onClose={close}
      title={`Return against ${bill.supplierInvoiceNo}`}
      description="Goods going back to the supplier"
    >
      <form
        id="return-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(
            {
              supplierPartyId: bill.supplierPartyId,
              siteId: bill.siteId,
              billId: bill.id,
              returnDate,
              reason,
              lines: [
                {
                  itemId,
                  warehouseId,
                  quantity,
                  rate,
                  cgstRate: half,
                  sgstRate: half,
                  igstRate: '0',
                },
              ],
            },
            { onSuccess: close },
          );
        }}
        className="flex flex-col gap-4"
      >
        <fieldset disabled={mutation.isPending} className="flex flex-col gap-3 border-0 p-0">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select id="ret-item" label="Item *" value={itemId} required onChange={(e) => setItemId(e.target.value)}>
              <option value="">Select…</option>
              {items?.items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name}
                </option>
              ))}
            </Select>
            <Select
              id="ret-warehouse"
              label="Out of *"
              value={warehouseId}
              required
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              <option value="">Select…</option>
              {warehouses?.items.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
            <Input
              id="ret-qty"
              label="Quantity *"
              inputMode="decimal"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <Input
              id="ret-rate"
              label="Rate *"
              inputMode="decimal"
              required
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
            <Input
              id="ret-tax"
              label="GST %"
              inputMode="decimal"
              value={taxRate}
              placeholder="12"
              onChange={(e) => setTaxRate(e.target.value)}
            />
            <Input
              id="ret-date"
              label="Returned on *"
              type="date"
              required
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
          </div>

          <Input
            id="ret-reason"
            label="Reason *"
            required
            value={reason}
            placeholder="Wet coal, rejected at the gate"
            onChange={(e) => setReason(e.target.value)}
          />

          <Alert variant="warning">
            This takes the goods out of stock and debits the supplier. If the stock has already been used, it will be
            refused rather than leaving the yard negative.
          </Alert>
        </fieldset>

        {mutation.isError && <Alert variant="error">{messageOf(mutation.error)}</Alert>}
      </form>

      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="return-form"
          disabled={mutation.isPending || reasonTooShort || !itemId || !warehouseId || !quantity || !rate}
        >
          {mutation.isPending ? 'Saving…' : 'Record return'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/** PUR-03 / PUR-04 / PUR-05 — bills, payments against them, and returns. */
export default function PurchaseBillsPage() {
  const { can } = useSession();
  const canManage = can(PERMISSIONS.PURCHASES_MANAGE);
  const canPay = canManage && can(PERMISSIONS.ACCOUNTS_MANAGE);
  const { data: suppliers } = useParties({ limit: 100, type: 'supplier' });

  const [filters, setFilters] = useState<{
    page: number;
    limit: number;
    supplierPartyId?: string;
    unpaidOnly?: 'true' | 'false';
  }>({
    page: 1,
    limit: 25,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [paying, setPaying] = useState<PurchaseBill | null>(null);
  const [returning, setReturning] = useState<PurchaseBill | null>(null);
  const { data, isLoading, isFetching, isError, error } = useBills(filters);

  const supplierName = (id: string) => suppliers?.items.find((s) => s.id === id)?.name ?? '—';

  const columns: Column<PurchaseBill>[] = [
    { key: 'invoice', header: 'Invoice', render: (b) => <span className="font-medium">{b.supplierInvoiceNo}</span> },
    { key: 'supplier', header: 'Supplier', render: (b) => supplierName(b.supplierPartyId) },
    { key: 'date', header: 'Date', hideOnMobile: true, render: (b) => formatDate(b.billDate) },
    {
      key: 'total',
      header: 'Total',
      className: 'text-right',
      render: (b) => <span className="tabular-nums">{formatINR(b.totalAmount)}</span>,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      className: 'text-right',
      render: (b) => {
        const left = subtractAmounts(b.totalAmount, b.paidAmount);
        return isZeroAmount(left) ? (
          <Badge variant="success">Paid</Badge>
        ) : (
          <span className="font-semibold tabular-nums">{formatINR(left)}</span>
        );
      },
    },
    ...(canPay
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (b: PurchaseBill) => (
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setReturning(b)}>
                  Return
                </Button>
                {!isZeroAmount(subtractAmounts(b.totalAmount, b.paidAmount)) && (
                  <Button size="sm" variant="outline" onClick={() => setPaying(b)}>
                    Pay
                  </Button>
                )}
              </div>
            ),
          } as Column<PurchaseBill>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
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
          <label className="flex items-end gap-2 pb-1.5 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
              checked={filters.unpaidOnly === 'true'}
              onChange={(e) => setFilters((f) => ({ ...f, unpaidOnly: e.target.checked ? 'true' : 'false', page: 1 }))}
            />
            <span>Only bills with something owing</span>
          </label>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden /> New bill
          </Button>
        )}
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load the bills')}</Alert>}

      <DataTable
        caption="Supplier bills"
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(b) => b.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={FileText}
            title="No bills yet"
            description="Record a supplier invoice to bring value into the books."
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

      <NewBillDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <PayDialog bill={paying} onClose={() => setPaying(null)} />
      <ReturnDialog bill={returning} onClose={() => setReturning(null)} />
    </div>
  );
}
