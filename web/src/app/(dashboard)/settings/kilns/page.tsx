'use client';

import { Flame, Plus } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useSession } from '@/features/auth/use-auth';
import { CreateSiteDialog } from '@/features/company/components/create-site-dialog';
import { useSites } from '@/features/company/hooks';
import type { Site } from '@/features/company/api';

export default function KilnsSettingsPage() {
  const { can } = useSession();
  const { data: sites, isLoading } = useSites();
  const [createOpen, setCreateOpen] = useState(false);

  const canManage = can(PERMISSIONS.COMPANY_MANAGE);

  const columns: Column<Site>[] = [
    { key: 'name', header: 'Name', render: (site) => <span className="font-medium">{site.name}</span> },
    { key: 'code', header: 'Code', render: (site) => site.code },
    {
      key: 'type',
      header: 'Type',
      render: (site) => <span className="capitalize">{site.type}</span>,
    },
    {
      key: 'address',
      header: 'Address',
      hideOnMobile: true,
      render: (site) => site.address ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (site) =>
        site.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Kilns, branches and depots you can access. Stock and production are tracked per kiln.
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden />
            Add kiln
          </Button>
        )}
      </div>

      <DataTable
        caption="Kilns and sites"
        columns={columns}
        rows={sites ?? []}
        rowKey={(site) => site.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={Flame}
            title="No kilns yet"
            description={
              canManage
                ? 'Add your first kiln to start recording production.'
                : 'Ask an owner to give you access to a kiln.'
            }
            action={
              canManage ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add kiln
                </Button>
              ) : undefined
            }
          />
        }
      />

      <CreateSiteDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
