'use client';

import { HardHat, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { formatINR, PERMISSIONS, WageActivity } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { messageOf, useSession } from '@/features/auth/use-auth';
import type { LabourGroup, Worker } from '@/features/labour/api';
import { GroupDialog } from '@/features/labour/components/group-dialog';
import { WorkerDialog } from '@/features/labour/components/worker-dialog';
import { useLabourGroups, useWorkers } from '@/features/labour/hooks';

const ACTIVITY_LABELS: Record<WageActivity, string> = {
  [WageActivity.MAKING]: 'Brick Making',
  [WageActivity.LOADING]: 'Chamber Loading',
  [WageActivity.UNLOADING]: 'Chamber Unloading',
  [WageActivity.DAILY_WAGE]: 'Daily Wage',
};

export default function GroupsPage() {
  const { can, sites } = useSession();
  const canManage = can(PERMISSIONS.LABOUR_MANAGE);

  // Group state
  const [editingGroup, setEditingGroup] = useState<LabourGroup | null>(null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  // Worker state
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('');
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [createWorkerOpen, setCreateWorkerOpen] = useState(false);

  const { data: groups, isLoading: loadingGroups, isError: groupError, error: groupErrorObj } = useLabourGroups();

  const {
    data: workers,
    isLoading: loadingWorkers,
    isError: workerError,
    error: workerErrorObj,
  } = useWorkers({
    labourGroupId: selectedGroupFilter || undefined,
  });

  const siteName = (id: string | null) => {
    if (!id) return 'All Kilns';
    return sites.find((s) => s.id === id)?.name ?? '—';
  };

  const groupColumns: Column<LabourGroup>[] = [
    {
      key: 'name',
      header: 'Group Name',
      render: (g) => <span className="font-semibold text-foreground">{g.name}</span>,
    },
    {
      key: 'sardar',
      header: 'Sardar',
      render: (g) => g.sardarParty?.name ?? '—',
    },
    {
      key: 'activity',
      header: 'Activity',
      render: (g) => ACTIVITY_LABELS[g.activity] ?? g.activity,
    },
    {
      key: 'kiln',
      header: 'Kiln',
      hideOnMobile: true,
      render: (g) => siteName(g.siteId),
    },
    {
      key: 'status',
      header: 'Status',
      render: (g) => <Badge variant={g.isActive ? 'success' : 'muted'}>{g.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (g) => (
        <div className="flex items-center justify-end gap-2">
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setEditingGroup(g)}>
              Edit
            </Button>
          )}
        </div>
      ),
    },
  ];

  const workerColumns: Column<Worker>[] = [
    {
      key: 'name',
      header: 'Worker Name',
      render: (w) => <span className="font-medium text-foreground">{w.name}</span>,
    },
    {
      key: 'group',
      header: 'Labour Group',
      render: (w) => w.labourGroup?.name ?? '—',
    },
    {
      key: 'phone',
      header: 'Phone',
      hideOnMobile: true,
      render: (w) => w.phone ?? '—',
    },
    {
      key: 'dailyWageRate',
      header: 'Daily Wage Rate',
      className: 'text-right',
      render: (w) =>
        w.dailyWageRate ? <span className="tabular-nums font-mono">{formatINR(w.dailyWageRate)}/day</span> : '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (w) => <Badge variant={w.isActive ? 'success' : 'muted'}>{w.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (w) => (
        <div className="flex items-center justify-end gap-2">
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setEditingWorker(w)}>
              Edit
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* SECTION A: Labour Groups */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Labour Groups (Gangs)</h2>
            <p className="text-xs text-muted-foreground">
              Teams of labour bound to a Sardar for brick making, chamber loading, or unloading.
            </p>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => setCreateGroupOpen(true)} className="min-h-[44px] shrink-0">
              <Plus className="h-4 w-4 mr-1" aria-hidden /> New Group
            </Button>
          )}
        </div>

        {groupError && <Alert variant="error">{messageOf(groupErrorObj, 'Could not load labour groups')}</Alert>}

        <DataTable
          caption="Labour groups"
          columns={groupColumns}
          rows={groups ?? []}
          rowKey={(g) => g.id}
          isLoading={loadingGroups}
          empty={
            <EmptyState
              icon={Users}
              title="No labour groups yet"
              description="Create a labour group under a Sardar to start logging gang activities."
            />
          }
        />
      </section>

      {/* SECTION B: Worker Roster */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Worker Roster</h2>
            <p className="text-xs text-muted-foreground">
              Individual workers mapped to their respective groups and wage rates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select
              aria-label="Filter workers by group"
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="w-48 text-xs"
            >
              <option value="">All Groups</option>
              {groups?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>

            {canManage && (
              <Button size="sm" onClick={() => setCreateWorkerOpen(true)} className="min-h-[44px] shrink-0">
                <Plus className="h-4 w-4 mr-1" aria-hidden /> New Worker
              </Button>
            )}
          </div>
        </div>

        {workerError && <Alert variant="error">{messageOf(workerErrorObj, 'Could not load workers')}</Alert>}

        <DataTable
          caption="Worker roster"
          columns={workerColumns}
          rows={workers ?? []}
          rowKey={(w) => w.id}
          isLoading={loadingWorkers}
          empty={
            <EmptyState
              icon={HardHat}
              title="No workers found"
              description="Add individual workers to the gang roster for individual attendance tracking."
            />
          }
        />
      </section>

      {/* Dialogs */}
      <GroupDialog open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} />
      {editingGroup && <GroupDialog open group={editingGroup} onClose={() => setEditingGroup(null)} />}

      <WorkerDialog
        open={createWorkerOpen}
        initialGroupId={selectedGroupFilter}
        onClose={() => setCreateWorkerOpen(false)}
      />
      {editingWorker && <WorkerDialog open worker={editingWorker} onClose={() => setEditingWorker(null)} />}
    </div>
  );
}
