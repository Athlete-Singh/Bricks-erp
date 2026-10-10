'use client';

import { Flame, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { formatDate, PERMISSIONS, PRODUCTION_BATCH_STATUSES, todayISO } from '@brics/shared';
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
import type { ProductionBatch } from '@/features/production/api';
import { useBatches, useCreateBatch } from '@/features/production/hooks';

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  firing: 'Firing',
  sorted: 'Sorted',
  closed: 'Closed',
};

const STATUS_TONE: Record<string, 'default' | 'success' | 'warning' | 'muted'> = {
  open: 'muted',
  firing: 'warning',
  sorted: 'success',
  closed: 'default',
};

function NewBatchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useCreateBatch();
  const { sites } = useSession();
  const [siteId, setSiteId] = useState('');
  const [chamber, setChamber] = useState('');
  const [batchDate, setBatchDate] = useState(todayISO());

  const close = () => {
    mutation.reset();
    setSiteId('');
    setChamber('');
    setBatchDate(todayISO());
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ siteId, chamber, batchDate }, { onSuccess: close });
  };

  return (
    <Dialog open={open} onClose={close} title="New batch" description="One batch is one chamber loaded on one day">
      <form id="batch-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset disabled={mutation.isPending} className="flex flex-col gap-4 border-0 p-0">
          <Select id="batch-site" label="Kiln *" value={siteId} required onChange={(e) => setSiteId(e.target.value)}>
            <option value="">Select a kiln…</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="batch-chamber"
              label="Chamber *"
              value={chamber}
              required
              placeholder="Chamber 1"
              onChange={(e) => setChamber(e.target.value)}
            />
            <Input
              id="batch-date"
              label="Loaded on *"
              type="date"
              required
              value={batchDate}
              onChange={(e) => setBatchDate(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">A chamber can only be loaded once on a given day.</p>
        </fieldset>

        {mutation.isError && <Alert variant="error">{messageOf(mutation.error)}</Alert>}
      </form>

      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" form="batch-form" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating…' : 'Create batch'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/** PRD-02 — the batch list, which is where a day's work starts. */
export default function BatchesPage() {
  const { can, sites } = useSession();
  const canManage = can(PERMISSIONS.PRODUCTION_MANAGE);

  const [filters, setFilters] = useState<{
    page: number;
    limit: number;
    siteId?: string;
    status?: string;
    from?: string;
    to?: string;
  }>({ page: 1, limit: 25 });
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isFetching, isError, error } = useBatches(filters);

  const set = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const siteName = (id: string) => sites.find((s) => s.id === id)?.name ?? '—';

  const columns: Column<ProductionBatch>[] = [
    {
      key: 'chamber',
      header: 'Chamber',
      render: (b) => (
        <Link href={`/production/batches/${b.id}`} className="font-medium text-primary hover:underline">
          {b.chamber}
        </Link>
      ),
    },
    { key: 'site', header: 'Kiln', render: (b) => siteName(b.siteId) },
    { key: 'date', header: 'Loaded', render: (b) => formatDate(b.batchDate) },
    {
      key: 'status',
      header: 'Status',
      render: (b) => <Badge variant={STATUS_TONE[b.status] ?? 'muted'}>{STATUS_LABELS[b.status] ?? b.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (b) => (
        <Link href={`/production/batches/${b.id}`} className="text-sm text-primary hover:underline">
          Open
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Kiln"
            value={filters.siteId ?? ''}
            onChange={(e) => set({ siteId: e.target.value || undefined })}
          >
            <option value="">All kilns</option>
            {sites.map((s) => (
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
            {PRODUCTION_BATCH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </Select>
          <Input
            label="From"
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => set({ from: e.target.value || undefined })}
          />
          <Input
            label="To"
            type="date"
            value={filters.to ?? ''}
            onChange={(e) => set({ to: e.target.value || undefined })}
          />
        </div>

        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden /> New batch
          </Button>
        )}
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load the batches')}</Alert>}

      <DataTable
        caption="Production batches"
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(b) => b.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={Flame}
            title="No batches yet"
            description={
              canManage ? 'Create a batch when a chamber is loaded.' : 'Batches appear as chambers are loaded.'
            }
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

      <NewBatchDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
