'use client';

import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import { AUDIT_ACTIONS, PERMISSIONS } from '@brics/shared';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Pagination } from '@/components/shared/pagination';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { messageOf, useSession } from '@/features/auth/use-auth';
import type { AuditEntry, AuditFilters } from '@/features/audit/api';
import { useAuditLogs } from '@/features/audit/hooks';
import { humanizeRole, useUsers } from '@/features/users/hooks';

const ACTION_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'muted'> = {
  CREATE: 'success',
  UPDATE: 'default',
  DELETE: 'danger',
  LOGIN: 'muted',
  LOGOUT: 'muted',
  PASSWORD_CHANGE: 'warning',
};

const EMPTY_FILTERS: AuditFilters = { page: 1, limit: 25 };

/** ADM-07 — the Owner's audit viewer. Tenant-scoped by the API, not by this page. */
export default function AuditLogsPage() {
  const { can } = useSession();
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [onlySupport, setOnlySupport] = useState(false);
  const { data, isLoading, isFetching, isError, error } = useAuditLogs(filters);
  const { data: users } = useUsers();

  if (!can(PERMISSIONS.AUDIT_VIEW)) {
    return (
      <EmptyState
        icon={ScrollText}
        title="You do not have access to the audit log"
        description="Ask an owner for the audit.view permission."
      />
    );
  }

  /** Any filter change returns to page 1, or you land past the end of the result. */
  const setFilter = (patch: AuditFilters) => setFilters((prev) => ({ ...prev, ...patch, page: 1 }));

  const nameOf = (userId: string | null) => {
    if (!userId) return 'System';
    return users?.find((u) => u.id === userId)?.name ?? 'Unknown user';
  };

  const columns: Column<AuditEntry>[] = [
    {
      key: 'when',
      header: 'When',
      render: (row) => new Date(row.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
    },
    {
      key: 'who',
      header: 'Who',
      render: (row) => {
        if (row.actorKind === 'platform_support') {
          const reason =
            row.afterState && typeof row.afterState.reason === 'string' && row.afterState.reason.trim()
              ? row.afterState.reason.trim()
              : null;
          const title = row.supportSessionId
            ? reason
              ? `Support session: ${row.supportSessionId} (${reason})`
              : `Support session: ${row.supportSessionId}`
            : reason
              ? `Support: ${reason}`
              : 'Support';

          return (
            <Badge variant="warning" title={title}>
              Support
            </Badge>
          );
        }

        if (row.actorKind === 'system') {
          return <Badge variant="muted">System</Badge>;
        }

        return nameOf(row.userId);
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => <Badge variant={ACTION_VARIANT[row.action] ?? 'muted'}>{humanizeRole(row.action)}</Badge>,
    },
    { key: 'entity', header: 'Record', render: (row) => row.entityName.replace(/_/g, ' ') },
    {
      key: 'change',
      header: 'Change',
      hideOnMobile: true,
      render: (row) => <AuditChange entry={row} />,
    },
    {
      key: 'ip',
      header: 'IP',
      hideOnMobile: true,
      render: (row) => row.ipAddress ?? <span className="text-muted-foreground">—</span>,
    },
  ];

  const hasFilters =
    onlySupport ||
    Object.entries(filters).some(
      ([key, value]) => !['page', 'limit'].includes(key) && value !== undefined && value !== '',
    );

  const rows = data?.items ?? [];
  const displayedRows = onlySupport ? rows.filter((row) => row.actorKind === 'platform_support') : rows;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Audit log" description="Who changed what, and when. Entries are never edited or deleted." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Select
          label="Action"
          value={filters.action ?? ''}
          onChange={(e) => setFilter({ action: e.target.value || undefined })}
        >
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {humanizeRole(action)}
            </option>
          ))}
        </Select>

        <Select
          label="User"
          value={filters.userId ?? ''}
          onChange={(e) => setFilter({ userId: e.target.value || undefined })}
        >
          <option value="">Everyone</option>
          {users?.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </Select>

        <Select
          label="Record"
          value={filters.entityName ?? ''}
          onChange={(e) => setFilter({ entityName: e.target.value || undefined })}
        >
          <option value="">All records</option>
          <option value="users">Users</option>
          <option value="companies">Companies</option>
          <option value="sites">Kilns</option>
          <option value="financial_years">Financial years</option>
        </Select>

        <Input
          label="From"
          type="date"
          value={filters.from ?? ''}
          onChange={(e) => setFilter({ from: e.target.value || undefined })}
        />
        <Input
          label="To"
          type="date"
          value={filters.to ?? ''}
          onChange={(e) => setFilter({ to: e.target.value || undefined })}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={onlySupport}
            onChange={(e) => setOnlySupport(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          Show only support entries
        </label>

        {hasFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              setOnlySupport(false);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load the audit log')}</Alert>}

      <DataTable
        caption="Audit entries"
        columns={columns}
        rows={displayedRows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={ScrollText}
            title={hasFilters ? 'Nothing matches these filters' : 'No activity recorded yet'}
            description={
              hasFilters ? 'Try widening the date range or clearing a filter.' : 'Entries appear as people use BRICS.'
            }
          />
        }
      />

      {data && (
        <Pagination
          meta={data.meta}
          isFetching={isFetching}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
        />
      )}
    </div>
  );
}

/** Shows which fields moved, rather than dumping the whole before/after JSON. */
function AuditChange({ entry }: { entry: AuditEntry }) {
  const { beforeState, afterState } = entry;
  if (!afterState) return <span className="text-muted-foreground">—</span>;

  const changed = Object.keys(afterState).filter(
    (key) => !beforeState || JSON.stringify(beforeState[key]) !== JSON.stringify(afterState[key]),
  );
  if (changed.length === 0) return <span className="text-muted-foreground">—</span>;

  return (
    <span className="text-xs text-muted-foreground" title={JSON.stringify({ before: beforeState, after: afterState })}>
      {changed.slice(0, 3).join(', ')}
      {changed.length > 3 && ` +${changed.length - 3}`}
    </span>
  );
}
