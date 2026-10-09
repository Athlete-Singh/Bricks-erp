'use client';

import { Building2, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatINR, PARTY_TYPES, PERMISSIONS, type PartyType } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Pagination } from '@/components/shared/pagination';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLedgerStatement } from '@/features/accounting/hooks';
import { messageOf, useSession } from '@/features/auth/use-auth';
import type { Party } from '@/features/masters/api';
import { useCreateParty, useParties, useUpdateParty } from '@/features/masters/hooks';

const PARTY_TYPE_LABELS: Record<string, string> = {
  customer: 'Customer',
  supplier: 'Supplier',
  sardar: 'Sardar',
  transporter: 'Transporter',
  employee: 'Employee',
  other: 'Other',
};

const PARTY_TYPE_COLORS: Record<string, 'default' | 'success' | 'warning' | 'muted'> = {
  customer: 'success',
  supplier: 'warning',
  sardar: 'default',
  transporter: 'default',
  employee: 'muted',
  other: 'muted',
};

function PartyTypeFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select label="Type" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All types</option>
      {PARTY_TYPES.map((t) => (
        <option key={t} value={t}>
          {PARTY_TYPE_LABELS[t]}
        </option>
      ))}
    </Select>
  );
}

type FormValues = {
  name: string;
  partyTypes: PartyType[];
  gstin: string;
  pan: string;
  phone: string;
  email: string;
  address: string;
  stateCode: string;
  openingDebit: string;
  openingCredit: string;
};

function PartyForm({
  initial,
  onSubmit,
  isSubmitting,
  error,
}: {
  initial?: Partial<FormValues>;
  onSubmit: (values: FormValues) => void;
  isSubmitting: boolean;
  error?: string;
}) {
  const [form, setForm] = useState<FormValues>({
    name: initial?.name ?? '',
    partyTypes: initial?.partyTypes ?? [],
    gstin: initial?.gstin ?? '',
    pan: initial?.pan ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    address: initial?.address ?? '',
    stateCode: initial?.stateCode ?? '',
    openingDebit: initial?.openingDebit ?? '',
    openingCredit: initial?.openingCredit ?? '',
  });

  const toggleType = (type: PartyType) =>
    setForm((f) => ({
      ...f,
      partyTypes: f.partyTypes.includes(type) ? f.partyTypes.filter((t) => t !== type) : [...f.partyTypes, type],
    }));

  return (
    <form
      id="party-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="flex flex-col gap-4"
    >
      {/* One disabled fieldset beats disabling each control — and it stops a
          double submit while the create is in flight. */}
      <fieldset disabled={isSubmitting} className="flex flex-col gap-4 border-0 p-0">
        <Input
          id="party-name"
          label="Name *"
          value={form.name}
          required
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />

        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">Type *</p>
          <div className="flex flex-wrap gap-2">
            {PARTY_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  form.partyTypes.includes(t)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {PARTY_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            id="party-gstin"
            label="GSTIN"
            value={form.gstin}
            placeholder="22AAAAA0000A1Z5"
            onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))}
          />
          <Input
            id="party-pan"
            label="PAN"
            value={form.pan}
            placeholder="AAAAA0000A"
            onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value }))}
          />
          <Input
            id="party-phone"
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Input
            id="party-email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            id="party-state-code"
            label="State code"
            value={form.stateCode}
            placeholder="09"
            onChange={(e) => setForm((f) => ({ ...f, stateCode: e.target.value }))}
          />
        </div>
        <Input
          id="party-address"
          label="Address"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
        />

        {!initial && (
          <fieldset className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
            <legend className="px-1 text-xs font-medium text-muted-foreground">Opening balance</legend>
            <Input
              id="party-opening-debit"
              label="Receivable (Dr)"
              inputMode="decimal"
              placeholder="0.00"
              value={form.openingDebit}
              onChange={(e) => setForm((f) => ({ ...f, openingDebit: e.target.value }))}
            />
            <Input
              id="party-opening-credit"
              label="Payable (Cr)"
              inputMode="decimal"
              placeholder="0.00"
              value={form.openingCredit}
              onChange={(e) => setForm((f) => ({ ...f, openingCredit: e.target.value }))}
            />
          </fieldset>
        )}
      </fieldset>

      {error && <Alert variant="error">{error}</Alert>}
    </form>
  );
}

function CreatePartyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { mutate, isPending, isError, error, reset } = useCreateParty();

  const close = () => {
    reset();
    onClose();
  };

  const handleSubmit = (values: FormValues) => {
    if (values.partyTypes.length === 0) return;
    mutate(
      {
        name: values.name,
        partyTypes: values.partyTypes,
        gstin: values.gstin || null,
        pan: values.pan || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        stateCode: values.stateCode || null,
        openingDebit: values.openingDebit || '',
        openingCredit: values.openingCredit || '',
      },
      { onSuccess: close },
    );
  };

  return (
    <Dialog open={open} onClose={close} title="Add party" description="A ledger is created automatically">
      <PartyForm onSubmit={handleSubmit} isSubmitting={isPending} error={isError ? messageOf(error) : undefined} />
      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" form="party-form" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function EditPartyDialog({ party, onClose }: { party: Party | null; onClose: () => void }) {
  const { mutate, isPending, isError, error, reset } = useUpdateParty();

  if (!party) return null;

  const close = () => {
    reset();
    onClose();
  };

  const handleSubmit = (values: FormValues) => {
    mutate(
      {
        id: party.id,
        dto: {
          name: values.name,
          partyTypes: values.partyTypes,
          gstin: values.gstin || null,
          pan: values.pan || null,
          phone: values.phone || null,
          email: values.email || null,
          address: values.address || null,
          stateCode: values.stateCode || null,
        },
      },
      { onSuccess: close },
    );
  };

  return (
    <Dialog open={!!party} onClose={close} title="Edit party">
      <PartyForm
        initial={{
          name: party.name,
          partyTypes: party.partyTypes,
          gstin: party.gstin ?? '',
          pan: party.pan ?? '',
          phone: party.phone ?? '',
          email: party.email ?? '',
          address: party.address ?? '',
          stateCode: party.stateCode ?? '',
        }}
        onSubmit={handleSubmit}
        isSubmitting={isPending}
        error={isError ? messageOf(error) : undefined}
      />
      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" form="party-form" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function PartyStatement({ party, onClose }: { party: Party; onClose: () => void }) {
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const { data, isLoading, isError, error } = useLedgerStatement(party.ledgerId, range);

  const outstanding = (() => {
    if (!data) return null;
    const receivable = data.closing.debit !== '0.00';
    const amount = receivable ? data.closing.debit : data.closing.credit;
    if (amount === '0.00') return { label: 'Settled', amount: '0.00', tone: 'muted' as const };
    return receivable
      ? { label: 'They owe you', amount, tone: 'success' as const }
      : { label: 'You owe them', amount, tone: 'warning' as const };
  })();

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{party.name}</h2>
          <p className="text-xs text-muted-foreground">Ledger statement and outstanding balance</p>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      {outstanding && (
        <Alert variant={outstanding.tone === 'muted' ? 'info' : outstanding.tone}>
          {outstanding.label}: <strong className="tabular-nums">{formatINR(outstanding.amount)}</strong>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          id="party-stmt-from"
          label="From"
          type="date"
          value={range.from ?? ''}
          onChange={(e) => setRange((r) => ({ ...r, from: e.target.value || undefined }))}
        />
        <Input
          id="party-stmt-to"
          label="To"
          type="date"
          value={range.to ?? ''}
          onChange={(e) => setRange((r) => ({ ...r, to: e.target.value || undefined }))}
        />
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}
      {isError && <Alert variant="error">{messageOf(error, 'Could not load the statement')}</Alert>}

      {data && data.rows.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No transactions yet"
          description="Entries appear here as invoices, payments and receipts are posted."
        />
      )}

      {data && data.rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">Statement for {party.name}</caption>
            <thead>
              <tr className="border-b border-border bg-surface-muted text-xs text-muted-foreground">
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Date
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Voucher
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Debit
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Credit
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.voucherId} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-3 py-2">{formatDate(row.voucherDate)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.number}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.debit === '0.00' ? '' : formatINR(row.debit)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.credit === '0.00' ? '' : formatINR(row.credit)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{formatINR(row.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function PartiesPage() {
  const { can } = useSession();
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const [viewing, setViewing] = useState<Party | null>(null);

  const {
    data: parties,
    isLoading,
    isFetching,
  } = useParties({ page, limit: 25, ...(typeFilter ? { type: typeFilter } : {}) });

  const canManage = can(PERMISSIONS.PARTIES_MANAGE);

  const columns: Column<Party>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (party) => (
        <button
          type="button"
          onClick={() => setViewing(party)}
          className="text-left font-medium text-primary hover:underline"
        >
          {party.name}
        </button>
      ),
    },
    {
      key: 'types',
      header: 'Types',
      render: (party) => (
        <div className="flex flex-wrap gap-1">
          {party.partyTypes.map((t) => (
            <Badge key={t} variant={PARTY_TYPE_COLORS[t] ?? 'muted'}>
              {PARTY_TYPE_LABELS[t] ?? t}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'gstin',
      header: 'GSTIN',
      hideOnMobile: true,
      render: (party) => party.gstin ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      hideOnMobile: true,
      render: (party) => party.phone ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (party) =>
        party.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>,
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (party: Party) => (
              <Button size="sm" variant="outline" onClick={() => setEditing(party)}>
                Edit
              </Button>
            ),
          } as Column<Party>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-48">
          <PartyTypeFilter
            value={typeFilter}
            onChange={(value) => {
              setTypeFilter(value);
              setPage(1);
            }}
          />
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden />
            Add party
          </Button>
        )}
      </div>

      <DataTable
        caption="Party masters"
        columns={columns}
        rows={parties?.items ?? []}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={Building2}
            title="No parties yet"
            description="Add customers, suppliers, Sardars, transporters or employees."
            action={
              canManage ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add party
                </Button>
              ) : undefined
            }
          />
        }
      />

      {parties && <Pagination meta={parties.meta} isFetching={isFetching} onPageChange={setPage} />}

      {viewing && <PartyStatement party={viewing} onClose={() => setViewing(null)} />}

      <CreatePartyDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditPartyDialog party={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
