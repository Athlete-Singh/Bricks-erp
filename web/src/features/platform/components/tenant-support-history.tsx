'use client';

import { PERMISSIONS, type SupportSessionDto } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useSession } from '@/features/auth/use-auth';
import { useTenantSupportSessions } from '../hooks';

export interface TenantSupportHistoryProps {
  tenantId: string;
}

/**
 * TenantSupportHistory (PLT-07)
 *
 * Displays past and active support sessions opened for a specific tenant.
 * Visible only to users with the `platform.tenants.view` permission.
 */
export function TenantSupportHistory({ tenantId }: TenantSupportHistoryProps) {
  const { can } = useSession();
  const allowed = can(PERMISSIONS.PLATFORM_TENANTS_VIEW);
  const { data: sessions, isLoading } = useTenantSupportSessions(allowed ? tenantId : undefined);

  if (!allowed) {
    return null;
  }

  const columns: Column<SupportSessionDto>[] = [
    {
      key: 'openedAt',
      header: 'Opened at',
      render: (row) => new Date(row.openedAt).toLocaleString(),
    },
    {
      key: 'closedAt',
      header: 'Closed at',
      render: (row) =>
        row.closedAt ? new Date(row.closedAt).toLocaleString() : <Badge variant="success">Active</Badge>,
    },
    {
      key: 'opener',
      header: 'Opener',
      render: (row) => row.platformUserName,
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => (
        <span className="block max-w-xs truncate" title={row.reason}>
          {row.reason}
        </span>
      ),
    },
    {
      key: 'closedBy',
      header: 'Closed by',
      render: (row) => row.closedBy ?? '—',
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Support session history</h3>
        <p className="text-xs text-muted-foreground">
          Audit trail of platform administrator sessions opened for this tenant.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={sessions ?? []}
        rowKey={(s) => s.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            title="No support sessions yet"
            description="No support sessions have been opened for this tenant."
          />
        }
      />
    </div>
  );
}
