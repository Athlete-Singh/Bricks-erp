'use client';

import { Plus, Receipt } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS, formatDate, formatINR, todayISO } from '@brics/shared';
import type { ExpensePaymentMode } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/shared/data-table';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { useLedgers } from '@/features/accounting/hooks';
import { useParties } from '@/features/masters/hooks';
import type { Expense } from '@/features/financials/api';
import { useCreateExpense, useExpenseCategories, useExpenses } from '@/features/financials/hooks';

function startOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/** EXP-01, EXP-02 — the expense register and the entry form. */
export default function ExpensesPage() {
  const { can, sites } = useSession();
  const [filters, setFilters] = useState({ fromDate: startOfMonth(), toDate: todayISO(), categoryLedgerId: '' });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useExpenses({ ...filters, categoryLedgerId: filters.categoryLedgerId || undefined });
  const { data: categories } = useExpenseCategories();
  const { data: ledgers } = useLedgers();
  const { data: suppliers } = useParties({ limit: 100, type: 'supplier' });

  const create = useCreateExpense();
  const canManage = can(PERMISSIONS.ACCOUNTS_MANAGE);

  const [form, setForm] = useState({
    siteId: '',
    categoryLedgerId: '',
    expenseDate: todayISO(),
    amount: '',
    mode: 'cash' as ExpensePaymentMode,
    paidFromLedgerId: '',
    partyId: '',
    instrumentType: '',
    instrumentRef: '',
    description: '',
  });

  if (!can(PERMISSIONS.ACCOUNTS_VIEW)) {
    return <Alert variant="info">You do not have access to the accounts.</Alert>;
  }

  const categoryName = (id: string) => categories?.find((c) => c.id === id)?.name ?? '—';

  const submit = async () => {
    setError(null);
    const onCredit = form.mode === 'credit';
    try {
      await create.mutateAsync({
        siteId: form.siteId,
        categoryLedgerId: form.categoryLedgerId,
        expenseDate: form.expenseDate,
        amount: form.amount,
        mode: form.mode,
        paidFromLedgerId: onCredit ? null : form.paidFromLedgerId,
        partyId: onCredit ? form.partyId : null,
        instrumentType: (form.instrumentType || null) as never,
        instrumentRef: form.instrumentRef || null,
        description: form.description || null,
      });
      setOpen(false);
      setForm((f) => ({ ...f, amount: '', instrumentRef: '', description: '' }));
    } catch (err) {
      setError(messageOf(err));
    }
  };

  const columns: Column<Expense>[] = [
    { key: 'no', header: 'No', render: (e) => <span className="font-medium">{e.expenseNo}</span> },
    { key: 'date', header: 'Date', render: (e) => formatDate(e.expenseDate) },
    { key: 'category', header: 'Category', render: (e) => categoryName(e.categoryLedgerId) },
    {
      key: 'desc',
      header: 'Description',
      hideOnMobile: true,
      render: (e) => e.description ?? <span className="text-muted-foreground">—</span>,
    },
    { key: 'amount', header: 'Amount', className: 'text-right', render: (e) => formatINR(e.amount) },
    {
      key: 'mode',
      header: 'Settled',
      render: (e) =>
        e.mode === 'credit' ? (
          // Nothing left the drawer — it is a liability until it is paid.
          <Badge variant="warning">owed</Badge>
        ) : (
          <div className="flex flex-col gap-0.5">
            <Badge variant="success">{e.mode}</Badge>
            {e.instrumentRef && <span className="text-[11px] text-muted-foreground">{e.instrumentRef}</span>}
          </div>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <Input
            label="From"
            type="date"
            value={filters.fromDate}
            onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
          />
          <Input
            label="To"
            type="date"
            value={filters.toDate}
            onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
          />
          <Select
            label="Category"
            value={filters.categoryLedgerId}
            onChange={(e) => setFilters((f) => ({ ...f, categoryLedgerId: e.target.value }))}
          >
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        {canManage && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Record an expense
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(e) => e.id}
        isLoading={isLoading}
        caption="Expense register"
        empty={
          <EmptyState
            icon={Receipt}
            title="Nothing recorded in this window"
            description="Electricity, rent, salary, office, government charges — whatever no other module already books."
          />
        }
      />

      <Dialog open={open} onClose={() => setOpen(false)} title="Record an expense">
        <div className="flex flex-col gap-3">
          {error && <Alert variant="error">{error}</Alert>}
          <div className="grid gap-3 sm:grid-cols-2">
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
              label="Category"
              value={form.categoryLedgerId}
              onChange={(e) => setForm((f) => ({ ...f, categoryLedgerId: e.target.value }))}
              required
            >
              <option value="">Select</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.kind === 'direct' ? '(direct)' : ''}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Date"
              type="date"
              value={form.expenseDate}
              onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
            />
            <Input
              label="Amount"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
            />
          </div>

          <Select
            label="How it was settled"
            value={form.mode}
            onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as ExpensePaymentMode }))}
          >
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="upi">UPI</option>
            <option value="credit">On credit — not paid yet</option>
          </Select>

          {form.mode === 'credit' ? (
            <Select
              label="Owed to"
              value={form.partyId}
              onChange={(e) => setForm((f) => ({ ...f, partyId: e.target.value }))}
              required
            >
              <option value="">Select</option>
              {suppliers?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          ) : (
            <>
              <Select
                label="Paid from"
                value={form.paidFromLedgerId}
                onChange={(e) => setForm((f) => ({ ...f, paidFromLedgerId: e.target.value }))}
                required
              >
                <option value="">Select</option>
                {ledgers?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Paid by"
                  value={form.instrumentType}
                  onChange={(e) => setForm((f) => ({ ...f, instrumentType: e.target.value }))}
                >
                  <option value="">Not recorded</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                  <option value="neft">NEFT</option>
                  <option value="rtgs">RTGS</option>
                  <option value="imps">IMPS</option>
                  <option value="card">Card</option>
                </Select>
                <Input
                  label="Reference"
                  value={form.instrumentRef}
                  onChange={(e) => setForm((f) => ({ ...f, instrumentRef: e.target.value }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The cheque number or UPI reference goes onto the voucher, so the bank book can be matched against the
                statement without opening each entry.
              </p>
            </>
          )}

          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={() => void submit()} disabled={create.isPending}>
              Save expense
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
