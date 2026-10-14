'use client';

import { Users } from 'lucide-react';
import type { TenantUserSummaryDto } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

export interface TenantUsersListProps {
  users: TenantUserSummaryDto[];
}

/**
 * TenantUsersList (PLT-09 / S3.1)
 *
 * Displays tenant user roster with contact details, assigned roles, and active status.
 * Strictly read-only for platform operators; modifications occur inside a support session.
 */
export function TenantUsersList({ users }: TenantUsersListProps) {
  const columns: Column<TenantUserSummaryDto>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (user) => <span className="font-medium text-foreground">{user.name}</span>,
    },
    {
      key: 'mobile',
      header: 'Mobile',
      render: (user) => user.mobile,
    },
    {
      key: 'email',
      header: 'Email',
      hideOnMobile: true,
      render: (user) => user.email ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => <Badge variant="default">{user.roleName}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) =>
        user.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>,
    },
    {
      key: 'createdAt',
      header: 'Added',
      hideOnMobile: true,
      render: (user) => new Date(user.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Users and roles</h3>
          <p className="text-xs text-muted-foreground">
            People who can sign in to this tenant. To add or edit users, open a support session.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={users}
        rowKey={(u) => u.id}
        empty={
          <EmptyState
            icon={Users}
            title="No users found"
            description="No users are currently assigned to this tenant."
          />
        }
      />
    </div>
  );
}
