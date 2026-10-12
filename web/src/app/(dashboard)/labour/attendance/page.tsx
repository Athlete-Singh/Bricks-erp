'use client';

import { CalendarCheck, Plus } from 'lucide-react';
import { useState } from 'react';
import { AttendanceStatus, formatDate, PERMISSIONS, todayISO } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { messageOf, useSession } from '@/features/auth/use-auth';
import type { LabourAttendance } from '@/features/labour/api';
import { AttendanceRegisterDialog } from '@/features/labour/components/attendance-register-dialog';
import { useAttendance, useLabourGroups } from '@/features/labour/hooks';

const STATUS_VARIANTS: Record<AttendanceStatus, 'success' | 'warning' | 'muted'> = {
  [AttendanceStatus.PRESENT]: 'success',
  [AttendanceStatus.HALF_DAY]: 'warning',
  [AttendanceStatus.ABSENT]: 'muted',
};

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  [AttendanceStatus.PRESENT]: 'Present',
  [AttendanceStatus.HALF_DAY]: 'Half Day',
  [AttendanceStatus.ABSENT]: 'Absent',
};

export default function AttendancePage() {
  const { can, sites } = useSession();
  const canManage = can(PERMISSIONS.LABOUR_MANAGE);

  const [siteId, setSiteId] = useState('');
  const [labourGroupId, setLabourGroupId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: groups } = useLabourGroups({ siteId: siteId || undefined });

  const { data, isLoading, isError, error } = useAttendance({
    siteId: siteId || undefined,
    labourGroupId: labourGroupId || undefined,
    date: date || undefined,
  });

  const columns: Column<LabourAttendance>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (a) => <span className="font-medium">{formatDate(a.date)}</span>,
    },
    {
      key: 'worker',
      header: 'Worker Name',
      render: (a) => a.worker?.name ?? 'Group Entry',
    },
    {
      key: 'group',
      header: 'Group',
      render: (a) => a.labourGroup?.name ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => (
        <Badge variant={STATUS_VARIANTS[a.status] ?? 'muted'}>{STATUS_LABELS[a.status] ?? a.status}</Badge>
      ),
    },
    {
      key: 'overtimeHours',
      header: 'Overtime Hours',
      className: 'text-right',
      render: (a) =>
        a.overtimeHours && Number(a.overtimeHours) > 0 ? (
          <span className="tabular-nums font-mono">{a.overtimeHours} hrs</span>
        ) : (
          '—'
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <Select
            label="Kiln / Site"
            value={siteId}
            onChange={(e) => {
              setSiteId(e.target.value);
              setLabourGroupId('');
            }}
          >
            <option value="">All kilns</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          <Select label="Labour Group" value={labourGroupId} onChange={(e) => setLabourGroupId(e.target.value)}>
            <option value="">All groups</option>
            {groups?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>

          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {canManage && (
          <Button size="sm" onClick={() => setDialogOpen(true)} className="min-h-[44px] shrink-0">
            <Plus className="h-4 w-4 mr-1" aria-hidden /> Record Attendance
          </Button>
        )}
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load attendance records')}</Alert>}

      <DataTable
        caption="Attendance register"
        columns={columns}
        rows={data ?? []}
        rowKey={(a) => a.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={CalendarCheck}
            title="No attendance recorded"
            description={
              canManage
                ? 'Select a kiln and labour group to record daily attendance.'
                : 'No attendance records match the selected filters.'
            }
          />
        }
      />

      <AttendanceRegisterDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
