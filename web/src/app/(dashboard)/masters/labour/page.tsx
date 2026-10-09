'use client';

import { HardHat, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatINR, PERMISSIONS, WageActivity } from '@brics/shared';
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
import type { WageRate } from '@/features/masters/api';
import { useCreateWageRate, useUpdateWageRate, useWageRates } from '@/features/masters/hooks';

/** The four activities LAB-03 names, each with the unit it is conventionally paid by. */
const ACTIVITIES: { value: WageActivity; label: string; unit: string }[] = [
  { value: WageActivity.MAKING, label: 'Brick making', unit: '1000 bricks' },
  { value: WageActivity.LOADING, label: 'Loading', unit: '1000 bricks' },
  { value: WageActivity.UNLOADING, label: 'Unloading', unit: '1000 bricks' },
  { value: WageActivity.DAILY_WAGE, label: 'Daily wage', unit: 'day' },
];

const ACTIVITY_LABELS: Record<string, string> = Object.fromEntries(ACTIVITIES.map((a) => [a.value, a.label]));

function WageRateDialog({ open, rate, onClose }: { open: boolean; rate?: WageRate | null; onClose: () => void }) {
  const create = useCreateWageRate();
  const update = useUpdateWageRate();

  const [activity, setActivity] = useState<string>(rate?.activity ?? '');
  const [unit, setUnit] = useState(rate?.unit ?? '');
  const [rateAmount, setRateAmount] = useState(rate?.rateAmount ?? '');
  const [effectiveFrom, setEffectiveFrom] = useState(rate?.effectiveFrom ?? '');

  const mut = rate ? update : create;
  const error = mut.isError ? messageOf(mut.error) : undefined;

  const close = () => {
    mut.reset();
    onClose();
  };

  /** Each activity has a conventional unit, so fill it in rather than ask twice. */
  const pickActivity = (value: string) => {
    setActivity(value);
    const match = ACTIVITIES.find((a) => a.value === value);
    if (match && !rate) setUnit(match.unit);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dto = {
      activity: activity as WageActivity,
      unit,
      rateAmount,
      ...(effectiveFrom ? { effectiveFrom } : {}),
    };
    if (rate) update.mutate({ id: rate.id, dto }, { onSuccess: close });
    else create.mutate(dto, { onSuccess: close });
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={rate ? 'Edit wage rate' : 'Add wage rate'}
      description="One rate per activity. These drive the labour payout calculation."
    >
      <form id="wage-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset disabled={mut.isPending} className="flex flex-col gap-4 border-0 p-0">
          <Select
            id="wage-activity"
            label="Activity *"
            value={activity}
            required
            onChange={(e) => pickActivity(e.target.value)}
          >
            <option value="">Select activity…</option>
            {ACTIVITIES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="wage-unit"
              label="Per *"
              value={unit}
              required
              placeholder="1000 bricks"
              onChange={(e) => setUnit(e.target.value)}
            />
            <Input
              id="wage-amount"
              label="Rate (₹) *"
              inputMode="decimal"
              required
              placeholder="650.00"
              value={rateAmount}
              onChange={(e) => setRateAmount(e.target.value)}
            />
          </div>

          <Input
            id="wage-effective"
            label="Effective from"
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />

          <p className="text-xs text-muted-foreground">
            A revision applies from its date — payouts already made keep the old rate.
          </p>
        </fieldset>

        {error && <Alert variant="error">{error}</Alert>}
      </form>

      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={mut.isPending}>
          Cancel
        </Button>
        <Button type="submit" form="wage-form" disabled={mut.isPending}>
          {mut.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/** LAB-03 — piece rates by activity and the daily wage, per company. */
export default function LabourRatesPage() {
  const { can } = useSession();
  const canManage = can(PERMISSIONS.LABOUR_MANAGE);

  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<WageRate | null>(null);

  const { data, isLoading, isFetching, isError, error } = useWageRates({ page, limit: 25 });

  const columns: Column<WageRate>[] = [
    {
      key: 'activity',
      header: 'Activity',
      render: (r) => <span className="font-medium">{ACTIVITY_LABELS[r.activity] ?? r.activity}</span>,
    },
    { key: 'unit', header: 'Per', render: (r) => r.unit },
    {
      key: 'rate',
      header: 'Rate',
      className: 'text-right',
      render: (r) => <span className="tabular-nums">{formatINR(r.rateAmount)}</span>,
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
          Piece rates per 1,000 bricks, and the daily wage for time-paid work.
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden /> Add rate
          </Button>
        )}
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load the wage rates')}</Alert>}

      <DataTable
        caption="Wage rates"
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={HardHat}
            title="No wage rates yet"
            description="Add a rate for making, loading, unloading and the daily wage."
          />
        }
      />

      {data && <Pagination meta={data.meta} isFetching={isFetching} onPageChange={setPage} />}

      <WageRateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {editing && <WageRateDialog open rate={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
