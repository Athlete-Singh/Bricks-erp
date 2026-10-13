'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS, formatINR, todayISO } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/data-table';
import { useSession } from '@/features/auth/use-auth';
import { useAttendanceRegister, useWageRegister } from '@/features/dashboard/hooks';
import type { AttendanceRow, WageAccrualRow } from '@/features/dashboard/api';
import { downloadCsv } from '@/features/dashboard/csv';
import { cn } from '@/lib/cn';

function startOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * RPT-04 — labour register. Two tabs: attendance (one row per worker per day)
 * and wages (one row per Sardar per accrual period). Status pill coloured
 * so present / half / absent reads at a glance; export is CSV.
 */
export default function LabourRegisterPage() {
  const { can } = useSession();
  const [kind, setKind] = useState<'attendance' | 'wages'>('attendance');
  const [filters, setFilters] = useState({ fromDate: startOfMonth(), toDate: todayISO() });

  const attendance = useAttendanceRegister(kind === 'attendance' ? filters : { ...filters, fromDate: '', toDate: '' });
  const wages = useWageRegister(kind === 'wages' ? filters : { ...filters, fromDate: '', toDate: '' });

  if (!can(PERMISSIONS.ACCOUNTS_VIEW)) {
    return <Alert variant="info">You do not have access to the accounts.</Alert>;
  }

  const attRows = attendance.data?.items ?? [];
  const wageRows = wages.data?.items ?? [];
  const attMeta = attendance.data?.meta;
  const wageMeta = wages.data?.meta;

  const attColumns: Column<AttendanceRow>[] = [
    { key: 'date', header: 'Date', render: (r) => <span className="tabular-nums">{r.date}</span> },
    { key: 'group', header: 'Group', render: (r) => r.groupName ?? '—' },
    { key: 'worker', header: 'Worker', render: (r) => r.workerName ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const variant = r.status === 'present' ? 'success' : r.status === 'half_day' ? 'warning' : 'danger';
        return <Badge variant={variant}>{r.status.replace('_', ' ')}</Badge>;
      },
    },
    { key: 'ot', header: 'OT hours', hideOnMobile: true, render: (r) => r.overtimeHours },
  ];

  const wageColumns: Column<WageAccrualRow>[] = [
    { key: 'from', header: 'From', render: (r) => <span className="tabular-nums">{r.periodFrom}</span> },
    { key: 'to', header: 'To', render: (r) => <span className="tabular-nums">{r.periodTo}</span> },
    { key: 'sardar', header: 'Sardar', render: (r) => r.sardarName },
    {
      key: 'wages',
      header: 'Gross wages',
      render: (r) => <span className="tabular-nums font-medium">{formatINR(r.grossWages)}</span>,
    },
  ];

  const onExport = () => {
    if (kind === 'attendance') {
      if (!attRows.length) return;
      downloadCsv(
        `attendance-${filters.fromDate}-${filters.toDate}.csv`,
        ['Date', 'Group', 'Worker', 'Status', 'OT hours'],
        attRows.map((r) => [r.date, r.groupName ?? '', r.workerName ?? '', r.status, r.overtimeHours]),
      );
    } else {
      if (!wageRows.length) return;
      downloadCsv(
        `wage-register-${filters.fromDate}-${filters.toDate}.csv`,
        ['From', 'To', 'Sardar', 'Gross wages'],
        wageRows.map((r) => [r.periodFrom, r.periodTo, r.sardarName, r.grossWages]),
      );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-2" role="tablist" aria-label="Labour register kind">
            {(['attendance', 'wages'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm transition-colors',
                  kind === k
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {k === 'attendance' ? 'Attendance' : 'Wages'}
              </button>
            ))}
          </div>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">From</span>
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">To</span>
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
            />
          </label>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={kind === 'attendance' ? !attRows.length : !wageRows.length}
          aria-label={`Export ${kind} register as CSV`}
        >
          <Download className="mr-2 h-4 w-4" aria-hidden /> Export CSV
        </Button>
      </div>

      {kind === 'attendance' ? (
        <>
          {attMeta && attRows.length > 0 && (
            <div className="rounded-md border border-border bg-card px-4 py-3 text-sm">
              Present <span className="font-medium">{attMeta.presentDays}</span> · Half{' '}
              <span className="font-medium">{attMeta.halfDays}</span> · Absent{' '}
              <span className="font-medium">{attMeta.absentDays}</span>
            </div>
          )}
          <DataTable<AttendanceRow>
            columns={attColumns}
            rows={attRows}
            rowKey={(r) => r.id}
            isLoading={attendance.isLoading}
            empty={<Alert variant="info">No attendance in this window.</Alert>}
          />
        </>
      ) : (
        <>
          {wageMeta && wageRows.length > 0 && (
            <div className="rounded-md border border-border bg-card px-4 py-3 text-sm">
              Total gross wages <span className="tabular-nums font-medium">{formatINR(wageMeta.totalGrossWages)}</span>
            </div>
          )}
          <DataTable<WageAccrualRow>
            columns={wageColumns}
            rows={wageRows}
            rowKey={(r) => r.accrualId}
            isLoading={wages.isLoading}
            empty={<Alert variant="info">No wage accruals in this window.</Alert>}
          />
        </>
      )}
    </div>
  );
}
