'use client';

import { Plus, Scissors } from 'lucide-react';
import { useState } from 'react';
import { DeductionCategory, formatDate, formatINR, PERMISSIONS } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { messageOf, useSession } from '@/features/auth/use-auth';
import type { LabourDeduction } from '@/features/labour/api';
import { DeductionDialog } from '@/features/labour/components/deduction-dialog';
import { useDeductions } from '@/features/labour/hooks';
import { useParties } from '@/features/masters/hooks';

const CATEGORY_LABELS: Record<DeductionCategory, string> = {
  [DeductionCategory.KHURAK]: 'Khurak (Ration)',
  [DeductionCategory.LOAN_INSTALMENT]: 'Loan Instalment',
  [DeductionCategory.ADVANCE_RECOVERY]: 'Advance Recovery',
  [DeductionCategory.FINE]: 'Fine / Penalty',
};

const CATEGORY_BADGES: Record<DeductionCategory, 'default' | 'success' | 'warning' | 'danger'> = {
  [DeductionCategory.KHURAK]: 'default',
  [DeductionCategory.LOAN_INSTALMENT]: 'warning',
  [DeductionCategory.ADVANCE_RECOVERY]: 'success',
  [DeductionCategory.FINE]: 'danger',
};

export default function DeductionsPage() {
  const { can, sites } = useSession();
  const canManage = can(PERMISSIONS.LABOUR_MANAGE);

  const [siteId, setSiteId] = useState('');
  const [sardarPartyId, setSardarPartyId] = useState('');
  const [category, setCategory] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: sardars } = useParties({ type: 'sardar', limit: 100 });

  const { data, isLoading, isError, error } = useDeductions({
    siteId: siteId || undefined,
    sardarPartyId: sardarPartyId || undefined,
    category: (category as DeductionCategory) || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const columns: Column<LabourDeduction>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (d) => <span className="font-medium">{formatDate(d.date)}</span>,
    },
    {
      key: 'sardar',
      header: 'Sardar',
      render: (d) => d.sardarParty?.name ?? '—',
    },
    {
      key: 'worker',
      header: 'Worker',
      render: (d) => d.worker?.name ?? 'Entire Gang',
    },
    {
      key: 'category',
      header: 'Category',
      render: (d) => (
        <Badge variant={CATEGORY_BADGES[d.category] ?? 'default'}>{CATEGORY_LABELS[d.category] ?? d.category}</Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'text-right',
      render: (d) => <span className="tabular-nums font-semibold text-foreground">{formatINR(d.amount)}</span>,
    },
    {
      key: 'remarks',
      header: 'Remarks',
      hideOnMobile: true,
      render: (d) => d.remarks ?? '—',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select label="Kiln / Site" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">All kilns</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          <Select label="Sardar" value={sardarPartyId} onChange={(e) => setSardarPartyId(e.target.value)}>
            <option value="">All Sardars</option>
            {sardars?.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </Select>

          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />

          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        {canManage && (
          <Button size="sm" onClick={() => setDialogOpen(true)} className="min-h-[44px] shrink-0">
            <Plus className="h-4 w-4 mr-1" aria-hidden /> New Deduction
          </Button>
        )}
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load labour deductions')}</Alert>}

      <DataTable
        caption="Deductions register"
        columns={columns}
        rows={data ?? []}
        rowKey={(d) => d.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={Scissors}
            title="No deductions recorded"
            description={
              canManage
                ? 'Record ration (khurak), loan recoveries or fines.'
                : 'No deduction records match the chosen filters.'
            }
          />
        }
      />

      <DeductionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
