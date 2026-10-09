'use client';

import { Percent, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatDate, PERMISSIONS } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Pagination } from '@/components/shared/pagination';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { messageOf, useSession } from '@/features/auth/use-auth';
import type { HsnRate } from '@/features/masters/api';
import { useCreateHsnRate, useHsnRates, useUpdateHsnRate } from '@/features/masters/hooks';

/** Rates are decimal strings; show them the way a rate reads, not as money. */
function formatRate(value: string): string {
  return `${Number(value).toFixed(2).replace(/\.00$/, '')}%`;
}

function HsnRateDialog({ open, rate, onClose }: { open: boolean; rate?: HsnRate | null; onClose: () => void }) {
  const create = useCreateHsnRate();
  const update = useUpdateHsnRate();

  const [hsnCode, setHsnCode] = useState(rate?.hsnCode ?? '');
  const [description, setDescription] = useState(rate?.description ?? '');
  const [cgstRate, setCgstRate] = useState(rate?.cgstRate ?? '');
  const [sgstRate, setSgstRate] = useState(rate?.sgstRate ?? '');
  const [igstRate, setIgstRate] = useState(rate?.igstRate ?? '');
  const [effectiveFrom, setEffectiveFrom] = useState(rate?.effectiveFrom ?? '');

  const mut = rate ? update : create;
  const error = mut.isError ? messageOf(mut.error) : undefined;

  const close = () => {
    mut.reset();
    onClose();
  };

  /**
   * Within a state CGST and SGST each carry half; between states IGST carries
   * the whole. Typing the total and letting the halves follow is what an
   * accountant expects, and it removes the commonest data-entry mistake.
   */
  const applyTotal = (total: string) => {
    const half = (Number(total) / 2).toFixed(2);
    setIgstRate(total);
    setCgstRate(half);
    setSgstRate(half);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dto = {
      hsnCode,
      description: description || null,
      cgstRate: cgstRate || '0',
      sgstRate: sgstRate || '0',
      igstRate: igstRate || '0',
      ...(effectiveFrom ? { effectiveFrom } : {}),
    };
    if (rate) update.mutate({ id: rate.id, dto }, { onSuccess: close });
    else create.mutate(dto, { onSuccess: close });
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={rate ? 'Edit HSN rate' : 'Add HSN rate'}
      description="Your CA sets these. Clay building bricks are usually HSN 6904."
    >
      <form id="hsn-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset disabled={mut.isPending} className="flex flex-col gap-4 border-0 p-0">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="hsn-code"
              label="HSN / SAC code *"
              value={hsnCode}
              required
              placeholder="6904"
              onChange={(e) => setHsnCode(e.target.value)}
            />
            <Input
              id="hsn-effective"
              label="Effective from"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>

          <Input
            id="hsn-description"
            label="Description"
            value={description}
            placeholder="Clay building bricks"
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface-muted p-2">
            <span className="text-xs text-muted-foreground">Set a total rate:</span>
            {['5', '12', '18', '28'].map((total) => (
              <Button key={total} type="button" size="sm" variant="outline" onClick={() => applyTotal(total)}>
                {total}%
              </Button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              id="hsn-cgst"
              label="CGST %"
              inputMode="decimal"
              placeholder="6"
              value={cgstRate}
              onChange={(e) => setCgstRate(e.target.value)}
            />
            <Input
              id="hsn-sgst"
              label="SGST %"
              inputMode="decimal"
              placeholder="6"
              value={sgstRate}
              onChange={(e) => setSgstRate(e.target.value)}
            />
            <Input
              id="hsn-igst"
              label="IGST %"
              inputMode="decimal"
              placeholder="12"
              value={igstRate}
              onChange={(e) => setIgstRate(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            CGST + SGST applies within your own state; IGST applies to sales outside it.
          </p>
        </fieldset>

        {error && <Alert variant="error">{error}</Alert>}
      </form>

      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={mut.isPending}>
          Cancel
        </Button>
        <Button type="submit" form="hsn-form" disabled={mut.isPending}>
          {mut.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/** GST-01 — the HSN/SAC master with its GST rates, per company (ADR-018). */
export default function TaxesPage() {
  const { can } = useSession();
  const canManage = can(PERMISSIONS.TAXES_MANAGE);

  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<HsnRate | null>(null);

  const { data, isLoading, isFetching, isError, error } = useHsnRates({ page, limit: 25 });

  const columns: Column<HsnRate>[] = [
    { key: 'code', header: 'HSN / SAC', render: (r) => <span className="font-medium">{r.hsnCode}</span> },
    {
      key: 'description',
      header: 'Description',
      hideOnMobile: true,
      render: (r) => r.description ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'within',
      header: 'Within state',
      className: 'text-right',
      render: (r) => (
        <span className="tabular-nums">
          {formatRate(r.cgstRate)} + {formatRate(r.sgstRate)}
        </span>
      ),
    },
    {
      key: 'igst',
      header: 'Inter-state',
      className: 'text-right',
      render: (r) => <span className="tabular-nums">{formatRate(r.igstRate)}</span>,
    },
    { key: 'from', header: 'From', hideOnMobile: true, render: (r) => formatDate(r.effectiveFrom) },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          {!r.isActive && <Badge variant="muted">Inactive</Badge>}
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
              Edit
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Rates belong to this company — a second company can be on a different scheme.
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden /> Add rate
          </Button>
        )}
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load the HSN rates')}</Alert>}

      <DataTable
        caption="HSN and GST rates"
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={Percent}
            title="No HSN rates yet"
            description="Add the codes you invoice against. Your CA will know the right rate."
          />
        }
      />

      {data && <Pagination meta={data.meta} isFetching={isFetching} onPageChange={setPage} />}

      <HsnRateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {editing && <HsnRateDialog open rate={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
