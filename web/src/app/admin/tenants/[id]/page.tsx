'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, HeadphonesIcon, Pause, Play } from 'lucide-react';
import { PERMISSIONS } from '@brics/shared';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { PageSpinner } from '@/components/ui/spinner';
import { useSession, messageOf } from '@/features/auth/use-auth';
import { OpenSupportSessionDialog } from '@/features/platform/components/open-support-session-dialog';
import { SuspendTenantDialog } from '@/features/platform/components/suspend-tenant-dialog';
import { TenantStatusBadge } from '@/features/platform/components/tenant-status-badge';
import { TenantSupportHistory } from '@/features/platform/components/tenant-support-history';
import { useReactivateTenant, useTenant } from '@/features/platform/hooks';

/**
 * One tenant, metadata only. S1.2 keeps this thin — the full detail with
 * users, kiln counts, last activity and support session history is PLT-09
 * (S3.1), after support sessions ship.
 */
export default function AdminTenantDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useSession();
  const { data: tenant, isLoading, error } = useTenant(id);
  const reactivate = useReactivateTenant();
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [openSupport, setOpenSupport] = useState(false);

  const canManage = can(PERMISSIONS.PLATFORM_TENANTS_MANAGE);
  const canSupport = can(PERMISSIONS.PLATFORM_SUPPORT_REQUEST);

  if (isLoading) return <PageSpinner label="Loading tenant…" />;
  if (error) return <Alert variant="error">{messageOf(error, 'Could not load the tenant')}</Alert>;
  if (!tenant) return null;

  const details: Array<[string, string]> = [
    ['State code', tenant.stateCode],
    ['Plan', tenant.planName ?? '—'],
    ['Trial ends', tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString() : '—'],
    ['Last active', tenant.lastActiveAt ? new Date(tenant.lastActiveAt).toLocaleString() : '—'],
    ['Created', new Date(tenant.createdAt).toLocaleString()],
  ];

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/admin/tenants"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to tenants
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">{tenant.name}</h2>
            <TenantStatusBadge status={tenant.status} />
          </div>
          <p className="text-sm text-muted-foreground">Platform view — counts and dates only.</p>
        </div>
        <div className="flex items-center gap-2">
          {canSupport && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpenSupport(true)}
              disabled={tenant.status === 'suspended'}
              aria-label={`Open support session for ${tenant.name}`}
            >
              <HeadphonesIcon className="h-3 w-3" aria-hidden />
              Open support session
            </Button>
          )}
          {canManage &&
            (tenant.status === 'suspended' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => reactivate.mutate(tenant.id)}
                disabled={reactivate.isPending}
              >
                <Play className="h-3 w-3" aria-hidden />
                Reactivate
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setSuspendOpen(true)}>
                <Pause className="h-3 w-3" aria-hidden />
                Suspend
              </Button>
            ))}
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      <TenantSupportHistory tenantId={tenant.id} />

      <SuspendTenantDialog tenant={tenant} open={suspendOpen} onClose={() => setSuspendOpen(false)} />
      <OpenSupportSessionDialog tenant={tenant} open={openSupport} onClose={() => setOpenSupport(false)} />
    </div>
  );
}
