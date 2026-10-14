'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Pause, Play, Plus } from 'lucide-react';
import { PERMISSIONS, type TenantSummaryDto } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { useSession } from '@/features/auth/use-auth';
import { OnboardTenantDialog } from '@/features/platform/components/onboard-tenant-dialog';
import { SuspendTenantDialog } from '@/features/platform/components/suspend-tenant-dialog';
import { TenantStatusBadge } from '@/features/platform/components/tenant-status-badge';
import { useReactivateTenant, useTenants } from '@/features/platform/hooks';

/** Metadata only (PLT-04): counts and dates, never money, never the client's own parties. */
export default function AdminTenantsPage() {
  const { can } = useSession();
  const { data: tenants, isLoading } = useTenants();
  const reactivate = useReactivateTenant();

  const [query, setQuery] = useState('');
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [toSuspend, setToSuspend] = useState<TenantSummaryDto | null>(null);

  const canManage = can(PERMISSIONS.PLATFORM_TENANTS_MANAGE);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tenants ?? [];
    if (!q) return list;
    return list.filter((t) => t.name.toLowerCase().includes(q));
  }, [tenants, query]);

  const columns: Column<TenantSummaryDto>[] = [
    {
      key: 'name',
      header: 'Tenant',
      render: (t) => (
        <Link href={`/admin/tenants/${t.id}`} className="font-medium text-foreground hover:underline">
          {t.name}
        </Link>
      ),
    },
    { key: 'state', header: 'State', hideOnMobile: true, render: (t) => t.stateCode },
    { key: 'status', header: 'Status', render: (t) => <TenantStatusBadge status={t.status} /> },
    {
      key: 'plan',
      header: 'Plan',
      hideOnMobile: true,
      render: (t) => t.planName ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'created',
      header: 'Created',
      hideOnMobile: true,
      render: (t) => new Date(t.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (t) =>
        canManage ? (
          t.status === 'suspended' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => reactivate.mutate(t.id)}
              disabled={reactivate.isPending}
              aria-label={`Reactivate ${t.name}`}
            >
              <Play className="h-3 w-3" aria-hidden />
              Reactivate
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setToSuspend(t)} aria-label={`Suspend ${t.name}`}>
              <Pause className="h-3 w-3" aria-hidden />
              Suspend
            </Button>
          )
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tenants</h2>
          <p className="text-sm text-muted-foreground">
            Counts and dates only. Open a support session (coming in S2) to look at a tenant&apos;s own books.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setOnboardOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden />
            Onboard a tenant
          </Button>
        )}
      </div>

      <Input
        type="search"
        placeholder="Search by name"
        aria-label="Search tenants"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(t) => t.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            title="No tenants yet"
            description={canManage ? 'Onboard the first one above.' : 'Nothing has been onboarded yet.'}
          />
        }
      />

      <OnboardTenantDialog open={onboardOpen} onClose={() => setOnboardOpen(false)} />
      <SuspendTenantDialog tenant={toSuspend} open={toSuspend !== null} onClose={() => setToSuspend(null)} />
    </div>
  );
}
