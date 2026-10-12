'use client';

import { Plus, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatDate, formatINR, PERMISSIONS } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useLedgers } from '@/features/accounting/hooks';
import { messageOf, useSession } from '@/features/auth/use-auth';
import type { LabourAdvance } from '@/features/labour/api';
import { AdvanceDialog } from '@/features/labour/components/advance-dialog';
import { useAdvances } from '@/features/labour/hooks';
import { useParties } from '@/features/masters/hooks';

export default function AdvancesPage() {
  const { can, sites } = useSession();
  const canManage = can(PERMISSIONS.LABOUR_MANAGE);

  const [siteId, setSiteId] = useState('');
  const [sardarPartyId, setSardarPartyId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: sardars } = useParties({ type: 'sardar', limit: 100 });
  const { data: ledgers } = useLedgers();

  const ledgerMap = useMemo(() => {
    return new Map(ledgers?.map((l) => [l.id, l.name]) ?? []);
  }, [ledgers]);

  const { data, isLoading, isError, error } = useAdvances({
    siteId: siteId || undefined,
    sardarPartyId: sardarPartyId || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const totalAdvances = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [data]);

  const columns: Column<LabourAdvance>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (a) => <span className="font-medium">{formatDate(a.date)}</span>,
    },
    {
      key: 'sardar',
      header: 'Sardar',
      render: (a) => a.sardarParty?.name ?? '—',
    },
    {
      key: 'worker',
      header: 'Worker',
      render: (a) => a.worker?.name ?? 'Group General',
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'text-right',
      render: (a) => <span className="tabular-nums font-semibold text-foreground">{formatINR(a.amount)}</span>,
    },
    {
      key: 'paymentMode',
      header: 'Payment Mode',
      render: (a) => <span className="capitalize">{a.paymentMode.replace('_', ' ')}</span>,
    },
    {
      key: 'cashBankLedger',
      header: 'Cash/Bank Ledger',
      hideOnMobile: true,
      render: (a) => ledgerMap.get(a.cashBankLedgerId) ?? 'Cash / Bank',
    },
    {
      key: 'voucher',
      header: 'Voucher',
      hideOnMobile: true,
      render: (a) => (
        <span className="font-mono text-xs text-muted-foreground">{a.voucherId ? a.voucherId.slice(0, 8) : '—'}</span>
      ),
    },
    {
      key: 'remarks',
      header: 'Remarks',
      hideOnMobile: true,
      render: (a) => a.remarks ?? '—',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Summary card */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="mb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Advances Drawn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight text-foreground">{formatINR(totalAdvances)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data?.length ?? 0} advance payment{data?.length === 1 ? '' : 's'} in selected period
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />

          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        {canManage && (
          <Button size="sm" onClick={() => setDialogOpen(true)} className="min-h-[44px] shrink-0">
            <Plus className="h-4 w-4 mr-1" aria-hidden /> Give Advance
          </Button>
        )}
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load advances')}</Alert>}

      <DataTable
        caption="Advances register"
        columns={columns}
        rows={data ?? []}
        rowKey={(a) => a.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={Wallet}
            title="No advances recorded"
            description={
              canManage
                ? 'Issue an advance to a Sardar or worker with live exposure validation.'
                : 'No advances found matching selected filters.'
            }
          />
        }
      />

      <AdvanceDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
