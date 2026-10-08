'use client';

import { Plus, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useSession } from '@/features/auth/use-auth';
import { useSites } from '@/features/company/hooks';
import type { UserRow } from '@/features/users/api';
import { CreateUserDialog } from '@/features/users/components/create-user-dialog';
import { EditUserDialog } from '@/features/users/components/edit-user-dialog';
import { humanizeRole, useUsers } from '@/features/users/hooks';

export default function UsersSettingsPage() {
  const { can, user: me } = useSession();
  const { data: users, isLoading } = useUsers();
  const { data: sites } = useSites();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  const canManage = can(PERMISSIONS.USERS_MANAGE);

  /** Empty kiln access means every kiln — the backend's rule, shown plainly. */
  const kilnLabel = (user: UserRow) => {
    if (user.siteIds.length === 0) return 'All kilns';
    const names = user.siteIds.map((id) => sites?.find((s) => s.id === id)?.code ?? '?');
    return names.join(', ');
  };

  const columns: Column<UserRow>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (user) => (
        <span className="font-medium">
          {user.name}
          {user.id === me?.id && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
        </span>
      ),
    },
    { key: 'mobile', header: 'Mobile', render: (user) => user.mobile },
    {
      key: 'email',
      header: 'Email',
      hideOnMobile: true,
      render: (user) => user.email ?? <span className="text-muted-foreground">—</span>,
    },
    { key: 'role', header: 'Role', render: (user) => humanizeRole(user.roleCode) },
    { key: 'kilns', header: 'Kiln access', hideOnMobile: true, render: kilnLabel },
    {
      key: 'status',
      header: 'Status',
      render: (user) =>
        user.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (user) =>
        canManage ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(user)}>
            Edit
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          People who can sign in to this company. A role decides what they may do; kiln access decides where.
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden />
            Add user
          </Button>
        )}
      </div>

      <DataTable
        caption="Users"
        columns={columns}
        rows={users ?? []}
        rowKey={(user) => user.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={UsersRound}
            title="No users yet"
            description="Add the people who will record production, attendance and dispatches."
            action={
              canManage ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add user
                </Button>
              ) : undefined
            }
          />
        }
      />

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditUserDialog user={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
