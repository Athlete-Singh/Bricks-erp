'use client';

import { FileCheck, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatINR, PERMISSIONS, SettlementStatus } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { messageOf, useSession } from '@/features/auth/use-auth';
import type { LabourSettlement } from '@/features/labour/api';
import { AccrueWagesDialog } from '@/features/labour/components/accrue-wages-dialog';
import { SettlementDetailDialog } from '@/features/labour/components/settlement-detail-dialog';
import { SettlementDialog } from '@/features/labour/components/settlement-dialog';
import { useSettlements } from '@/features/labour/hooks';
import { useParties } from '@/features/masters/hooks';

const STATUS_VARIANTS: Record<SettlementStatus, 'muted' | 'warning' | 'success'> = {
  [SettlementStatus.DRAFT]: 'muted',
  [SettlementStatus.POSTED]: 'warning',
  [SettlementStatus.PAID]: 'success',
};

const STATUS_LABELS: Record<SettlementStatus, string> = {
  [SettlementStatus.DRAFT]: 'Draft',
  [SettlementStatus.POSTED]: 'Posted',
  [SettlementStatus.PAID]: 'Paid',
};

export default function SettlementsPage() {
  const { can, sites } = useSession();
  const canManage = can(PERMISSIONS.LABOUR_MANAGE);

  const [siteId, setSiteId] = useState('');
  const [sardarPartyId, setSardarPartyId] = useState('');
  const [status, setStatus] = useState<string>('');

  // Dialog states
  const [accrueOpen, setAccrueOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [statementSettlementId, setStatementSettlementId] = useState<string | null>(null);

  const { data: sardars } = useParties({ type: 'sardar', limit: 100 });

  const { data, isLoading, isError, error } = useSettlements({
    siteId: siteId || undefined,
    sardarPartyId: sardarPartyId || undefined,
    status: (status as SettlementStatus) || undefined,
  });

  const columns: Column<LabourSettlement>[] = [
    {
      key: 'period',
      header: 'Period',
      render: (s) => (
        <span className="font-medium text-foreground">
          {formatDate(s.periodFrom)} to {formatDate(s.periodTo)}
        </span>
      ),
    },
    {
      key: 'sardar',
      header: 'Sardar',
      render: (s) => s.sardarParty?.name ?? '—',
    },
    {
      key: 'grossWages',
      header: 'Gross Wages',
      className: 'text-right',
      render: (s) => <span className="tabular-nums font-mono text-foreground">{formatINR(s.grossWages)}</span>,
    },
    {
      key: 'advancesRecovered',
      header: 'Advances Recovered',
      className: 'text-right',
      hideOnMobile: true,
      render: (s) => <span className="tabular-nums font-mono text-danger">- {formatINR(s.advancesRecovered)}</span>,
    },
    {
      key: 'deductions',
      header: 'Deductions',
      className: 'text-right',
      hideOnMobile: true,
      render: (s) => <span className="tabular-nums font-mono text-danger">- {formatINR(s.deductions)}</span>,
    },
    {
      key: 'netPayable',
      header: 'Net Payable',
      className: 'text-right',
      render: (s) => <span className="tabular-nums font-semibold text-primary">{formatINR(s.netPayable)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <Badge variant={STATUS_VARIANTS[s.status] ?? 'muted'}>{STATUS_LABELS[s.status] ?? s.status}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (s) => (
        <Button size="sm" variant="outline" onClick={() => setStatementSettlementId(s.id)}>
          View Statement
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
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

          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value={SettlementStatus.DRAFT}>Draft</option>
            <option value={SettlementStatus.POSTED}>Posted</option>
            <option value={SettlementStatus.PAID}>Paid</option>
          </Select>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setAccrueOpen(true)} className="min-h-[44px] shrink-0">
              <Sparkles className="h-4 w-4 mr-1 text-primary" aria-hidden /> Accrue Wages (LAB-04)
            </Button>
            <Button size="sm" onClick={() => setSettleOpen(true)} className="min-h-[44px] shrink-0">
              <Plus className="h-4 w-4 mr-1" aria-hidden /> New Settlement (LAB-07)
            </Button>
          </div>
        )}
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load wage settlements')}</Alert>}

      <DataTable
        caption="Wage settlements register"
        columns={columns}
        rows={data ?? []}
        rowKey={(s) => s.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={FileCheck}
            title="No wage settlements yet"
            description={
              canManage
                ? 'Accrue wages from production or create seasonal settlements for Sardars.'
                : 'No settlements found for selected filters.'
            }
          />
        }
      />

      <AccrueWagesDialog open={accrueOpen} onClose={() => setAccrueOpen(false)} />
      <SettlementDialog open={settleOpen} onClose={() => setSettleOpen(false)} />
      <SettlementDetailDialog
        open={Boolean(statementSettlementId)}
        settlementId={statementSettlementId}
        onClose={() => setStatementSettlementId(null)}
      />
    </div>
  );
}
