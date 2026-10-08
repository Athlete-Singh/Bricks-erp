'use client';

import { CalendarRange, Plus } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS } from '@brics/shared';
import { formatDate } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { CreateFinancialYearDialog } from '@/features/company/components/create-financial-year-dialog';
import { useActivateFinancialYear, useFinancialYears } from '@/features/company/hooks';
import type { FinancialYear } from '@/features/company/api';

export default function FinancialYearsSettingsPage() {
  const { can } = useSession();
  const { data: years, isLoading } = useFinancialYears();
  const activate = useActivateFinancialYear();
  const [createOpen, setCreateOpen] = useState(false);

  const canManage = can(PERMISSIONS.COMPANY_MANAGE);

  const columns: Column<FinancialYear>[] = [
    { key: 'name', header: 'Financial year', render: (fy) => <span className="font-medium">{fy.name}</span> },
    { key: 'start', header: 'From', render: (fy) => formatDate(fy.startDate) },
    { key: 'end', header: 'To', render: (fy) => formatDate(fy.endDate) },
    {
      key: 'status',
      header: 'Status',
      render: (fy) => (
        <span className="flex items-center justify-end gap-1.5 sm:justify-start">
          {fy.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}
          {fy.isLocked && <Badge variant="warning">Locked</Badge>}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (fy) =>
        canManage && !fy.isActive ? (
          <Button size="sm" variant="outline" disabled={activate.isPending} onClick={() => activate.mutate(fy.id)}>
            {activate.isPending && activate.variables === fy.id ? <Spinner className="h-3 w-3" /> : 'Set active'}
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Exactly one year is active at a time; new vouchers post into it.
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden />
            Add year
          </Button>
        )}
      </div>

      {activate.isError && (
        <Alert variant="error">{messageOf(activate.error, 'Could not change the active year')}</Alert>
      )}

      <DataTable
        caption="Financial years"
        columns={columns}
        rows={years ?? []}
        rowKey={(fy) => fy.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={CalendarRange}
            title="No financial years yet"
            description={
              canManage
                ? 'Add one before recording transactions — vouchers post into the active year.'
                : 'Ask an owner to create the first financial year.'
            }
            action={
              canManage ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add year
                </Button>
              ) : undefined
            }
          />
        }
      />

      <CreateFinancialYearDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
