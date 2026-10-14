'use client';

import { Flame } from 'lucide-react';
import type { TenantSiteSummaryDto } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

export interface TenantKilnsListProps {
  kilns: TenantSiteSummaryDto[];
}

/**
 * TenantKilnsList (PLT-09 / S3.1)
 *
 * Displays kilns, branch chimneys, and depots registered under the tenant.
 * Read-only view for platform operators; configuration occurs inside a support session.
 */
export function TenantKilnsList({ kilns }: TenantKilnsListProps) {
  const columns: Column<TenantSiteSummaryDto>[] = [
    {
      key: 'name',
      header: 'Kiln / Site name',
      render: (site) => <span className="font-medium text-foreground">{site.name}</span>,
    },
    {
      key: 'code',
      header: 'Code',
      render: (site) => <span className="font-mono text-xs text-muted-foreground">{site.code}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (site) => <span className="capitalize">{site.type}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (site) =>
        site.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>,
    },
    {
      key: 'createdAt',
      header: 'Added',
      hideOnMobile: true,
      render: (site) => new Date(site.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Kilns and sites</h3>
          <p className="text-xs text-muted-foreground">
            Production sites, branch chimneys, and depots. To manage kilns, open a support session.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={kilns}
        rowKey={(s) => s.id}
        empty={
          <EmptyState
            icon={Flame}
            title="No kilns or sites found"
            description="This tenant has not registered any production sites yet."
          />
        }
      />
    </div>
  );
}
