'use client';

import { AlertTriangle, Plus, ShieldCheck, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatINR, PERMISSIONS } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { messageOf, useSession } from '@/features/auth/use-auth';
import type { AdvanceExposureResult } from '@/features/labour/api';
import { AdvanceDialog } from '@/features/labour/components/advance-dialog';
import { useExposureSummary } from '@/features/labour/hooks';

export default function ExposurePage() {
  const { can, sites } = useSession();
  const canManage = can(PERMISSIONS.LABOUR_MANAGE);

  const [siteId, setSiteId] = useState('');
  const [onlyExposed, setOnlyExposed] = useState(false);
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [selectedSardarId, setSelectedSardarId] = useState<string | undefined>(undefined);

  const { data, isLoading, isError, error } = useExposureSummary({
    siteId: siteId || undefined,
    onlyExposed: onlyExposed || undefined,
  });

  const totals = useMemo(() => {
    if (!data) return { advances: 0, wages: 0, deductions: 0, net: 0, exposedCount: 0 };
    return data.reduce(
      (acc, row) => ({
        advances: acc.advances + Number(row.advancesDrawn),
        wages: acc.wages + Number(row.wagesEarned),
        deductions: acc.deductions + Number(row.deductionsTotal),
        net: acc.net + Number(row.netExposure),
        exposedCount: acc.exposedCount + (row.isExposed ? 1 : 0),
      }),
      { advances: 0, wages: 0, deductions: 0, net: 0, exposedCount: 0 },
    );
  }, [data]);

  const handleGiveAdvance = (sardarId: string) => {
    setSelectedSardarId(sardarId);
    setAdvanceDialogOpen(true);
  };

  const columns: Column<AdvanceExposureResult>[] = [
    {
      key: 'sardar',
      header: 'Sardar',
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{r.sardarName}</span>
          {r.warning && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400">⚠️ Advances exceed wages earned</span>
          )}
        </div>
      ),
    },
    {
      key: 'advances',
      header: 'Advances Drawn',
      className: 'text-right font-mono',
      render: (r) => formatINR(r.advancesDrawn),
    },
    {
      key: 'wages',
      header: 'Wages Earned',
      className: 'text-right font-mono',
      render: (r) => formatINR(r.wagesEarned),
    },
    {
      key: 'deductions',
      header: 'Deductions Total',
      className: 'text-right font-mono',
      render: (r) => formatINR(r.deductionsTotal),
    },
    {
      key: 'netExposure',
      header: 'Net Unsecured Exposure',
      className: 'text-right font-mono font-semibold',
      render: (r) => (
        <span className={r.isExposed ? 'text-red-600 dark:text-red-400 font-bold' : 'text-foreground'}>
          {formatINR(r.netExposure)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Risk Status',
      render: (r) => (r.isExposed ? <Badge variant="danger">Exposed</Badge> : <Badge variant="success">Safe</Badge>),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleGiveAdvance(r.sardarPartyId)}
              className="min-h-[44px] sm:min-h-[32px]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden /> Advance
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Leakage Protection Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-amber-950 dark:text-amber-100">
              LEK-03: Live Sardar Advance Exposure Monitor
            </span>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Formula:{' '}
              <span className="font-mono font-semibold">Net Exposure = Advances Drawn − Wages Earned − Deductions</span>
              . Sardars with positive net exposure have drawn more cash than their gang has produced. Entry forms warn
              supervisors in real-time.
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Advances Drawn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-bold text-foreground">{formatINR(totals.advances.toFixed(2))}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Wages Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-bold text-foreground">{formatINR(totals.wages.toFixed(2))}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Deductions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-bold text-foreground">{formatINR(totals.deductions.toFixed(2))}</p>
          </CardContent>
        </Card>

        <Card className={totals.net > 0 ? 'border-red-300 bg-red-50/20 dark:border-red-900/30' : ''}>
          <CardHeader>
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Net Exposure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`font-mono text-2xl font-bold ${
                totals.net > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'
              }`}
            >
              {formatINR(totals.net.toFixed(2))}
            </p>
            {totals.exposedCount > 0 && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
                {totals.exposedCount} Sardar(s) currently exposed
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-56">
            <Select
              id="exposure-site"
              aria-label="Filter by site"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
            >
              <option value="">All Kilns / Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={onlyExposed}
              onChange={(e) => setOnlyExposed(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            Show Only Exposed Sardars
          </label>
        </div>
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load exposure summary')}</Alert>}

      {/* Ranking Table */}
      <DataTable
        caption="Sardar advance exposure ranking"
        columns={columns}
        rows={data ?? []}
        rowKey={(r) => r.sardarPartyId}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={onlyExposed ? ShieldCheck : Users}
            title={onlyExposed ? 'No exposed Sardars' : 'No Sardar exposure data'}
            description={
              onlyExposed
                ? 'All Sardars have earned wages covering or exceeding their advances drawn.'
                : 'Advances and wages will be reflected here once recorded.'
            }
          />
        }
      />

      <AdvanceDialog
        open={advanceDialogOpen}
        defaultSardarId={selectedSardarId}
        onClose={() => {
          setAdvanceDialogOpen(false);
          setSelectedSardarId(undefined);
        }}
      />
    </div>
  );
}
