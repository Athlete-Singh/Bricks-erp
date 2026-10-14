'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock, FileText, Flame, HeadphonesIcon, Pause, Play, Shield, Users } from 'lucide-react';
import { PERMISSIONS } from '@brics/shared';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { PageSpinner, Spinner } from '@/components/ui/spinner';
import { useSession, messageOf } from '@/features/auth/use-auth';
import { OpenSupportSessionDialog } from '@/features/platform/components/open-support-session-dialog';
import { SuspendTenantDialog } from '@/features/platform/components/suspend-tenant-dialog';
import { TenantKilnsList } from '@/features/platform/components/tenant-kilns-list';
import { TenantStatusBadge } from '@/features/platform/components/tenant-status-badge';
import { TenantSupportHistory } from '@/features/platform/components/tenant-support-history';
import { TenantUsersList } from '@/features/platform/components/tenant-users-list';
import { useReactivateTenant, useTenant, useUpdateTenantSettings } from '@/features/platform/hooks';
import { cn } from '@/lib/cn';

type DetailTab = 'users' | 'kilns' | 'support';

/**
 * Tenant detail page (PLT-09 / S3.1)
 *
 * Full administrative view for a tenant:
 * - High-level metrics: user count, active/total kilns, document counts, last activity
 * - Company metadata: GSTIN, state, plan, trial expiry, registration date
 * - Tabbed breakdowns: Users & roles, Kilns & sites, Support session audit history
 *
 * Strictly enforces metadata privacy: counts and dates only, never private ledgers or balances.
 */
export default function AdminTenantDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useSession();
  const { data: tenant, isLoading, error } = useTenant(id);
  const reactivate = useReactivateTenant();
  const updateSettings = useUpdateTenantSettings();
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [openSupport, setOpenSupport] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('users');

  const canManage = can(PERMISSIONS.PLATFORM_TENANTS_MANAGE);
  const canSupport = can(PERMISSIONS.PLATFORM_SUPPORT_REQUEST);

  if (isLoading) return <PageSpinner label="Loading tenant…" />;
  if (error) return <Alert variant="error">{messageOf(error, 'Could not load the tenant')}</Alert>;
  if (!tenant) return null;

  const details: Array<[string, string]> = [
    ['State code', tenant.stateCode],
    ['GSTIN', tenant.gstin ?? '—'],
    ['Plan', tenant.planName ?? 'Starter'],
    [
      'Support approval',
      tenant.requireSupportApproval ? 'Required (explicit code/grant)' : 'Default (announce-afterwards)',
    ],
    ['Trial ends', tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString() : '—'],
    ['Last active', tenant.lastActiveAt ? new Date(tenant.lastActiveAt).toLocaleString() : 'Never'],
    ['Created', new Date(tenant.createdAt).toLocaleString()],
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/tenants"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to tenants
      </Link>

      {/* Header with Title, Status & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">{tenant.name}</h2>
            <TenantStatusBadge status={tenant.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform tenant view — counts, users, and audit records only.
          </p>
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
              <HeadphonesIcon className="h-3.5 w-3.5" aria-hidden />
              Open support session
            </Button>
          )}
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                updateSettings.mutate({
                  id: tenant.id,
                  dto: { requireSupportApproval: !tenant.requireSupportApproval },
                })
              }
              disabled={updateSettings.isPending}
            >
              <Shield className="h-3.5 w-3.5" aria-hidden />
              {updateSettings.isPending ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : tenant.requireSupportApproval ? (
                'Disable approval requirement'
              ) : (
                'Require support approval'
              )}
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
                <Play className="h-3.5 w-3.5" aria-hidden />
                Reactivate
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setSuspendOpen(true)}>
                <Pause className="h-3.5 w-3.5" aria-hidden />
                Suspend
              </Button>
            ))}
        </div>
      </div>

      {/* High-level Count Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-lg bg-surface-muted p-2.5 text-foreground">
            <Users className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{tenant.counts.users}</div>
            <div className="text-xs text-muted-foreground">Registered users</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-lg bg-surface-muted p-2.5 text-foreground">
            <Flame className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {tenant.counts.activeKilns}{' '}
              <span className="text-sm font-normal text-muted-foreground">/ {tenant.counts.kilns}</span>
            </div>
            <div className="text-xs text-muted-foreground">Active / total kilns</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-lg bg-surface-muted p-2.5 text-foreground">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {tenant.counts.vouchers + tenant.counts.salesInvoices}
            </div>
            <div className="text-xs text-muted-foreground">
              {tenant.counts.vouchers} vouchers · {tenant.counts.salesInvoices} invoices
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-lg bg-surface-muted p-2.5 text-foreground">
            <Clock className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-foreground">
              {tenant.lastActiveAt ? new Date(tenant.lastActiveAt).toLocaleDateString() : 'Never'}
            </div>
            <div className="text-xs text-muted-foreground">
              {tenant.lastActiveAt ? new Date(tenant.lastActiveAt).toLocaleTimeString() : 'No activity yet'}
            </div>
          </div>
        </Card>
      </div>

      {/* Metadata Specification Grid */}
      <dl className="grid gap-x-6 gap-y-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-3">
        {details.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="text-sm font-semibold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Tab Navigation */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={cn(
            'inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            activeTab === 'users'
              ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
          )}
        >
          <Users className="h-4 w-4" aria-hidden />
          Users & roles ({tenant.users.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kilns')}
          className={cn(
            'inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            activeTab === 'kilns'
              ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
          )}
        >
          <Flame className="h-4 w-4" aria-hidden />
          Kilns & sites ({tenant.kilns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('support')}
          className={cn(
            'inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            activeTab === 'support'
              ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
          )}
        >
          <HeadphonesIcon className="h-4 w-4" aria-hidden />
          Support history
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'users' && <TenantUsersList users={tenant.users} />}
      {activeTab === 'kilns' && <TenantKilnsList kilns={tenant.kilns} />}
      {activeTab === 'support' && <TenantSupportHistory tenantId={tenant.id} />}

      {/* Operational Modals */}
      <SuspendTenantDialog tenant={tenant} open={suspendOpen} onClose={() => setSuspendOpen(false)} />
      <OpenSupportSessionDialog tenant={tenant} open={openSupport} onClose={() => setOpenSupport(false)} />
    </div>
  );
}
