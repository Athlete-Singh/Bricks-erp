'use client';

import { ChevronDown, KeyRound, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { Spinner } from '@/components/ui/spinner';
import { ChangePasswordDialog } from '@/features/auth/components/change-password-dialog';
import { useLogout, useSession } from '@/features/auth/use-auth';

export function UserMenu() {
  const { user, company } = useSession();
  const logout = useLogout();
  const [passwordOpen, setPasswordOpen] = useState(false);

  if (!user) return null;

  const roleLabel = user.roleCode.replace(/_/g, ' ');

  return (
    <>
      <Dropdown
        label="Account menu"
        trigger={({ open }) => (
          <span className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-surface-muted">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
              aria-hidden
            >
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-xs font-medium text-foreground">{user.name}</span>
              <span className="block text-[11px] capitalize text-muted-foreground">{roleLabel}</span>
            </span>
            <ChevronDown
              className={`h-3 w-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </span>
        )}
      >
        {({ close }) => (
          <>
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email ?? user.mobile}</p>
              {company && <p className="mt-1 truncate text-[11px] text-muted-foreground">{company.name}</p>}
              <p className="mt-1 inline-flex rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium capitalize text-primary">
                {roleLabel}
              </p>
            </div>

            <DropdownSeparator />

            <DropdownItem
              onSelect={() => {
                close();
                setPasswordOpen(true);
              }}
            >
              <KeyRound className="h-3.5 w-3.5" aria-hidden />
              Change password
            </DropdownItem>

            <DropdownItem
              disabled={logout.isPending}
              onSelect={() => {
                close();
                logout.mutate();
              }}
            >
              {logout.isPending ? <Spinner className="h-3.5 w-3.5" /> : <LogOut className="h-3.5 w-3.5" aria-hidden />}
              Sign out
            </DropdownItem>
          </>
        )}
      </Dropdown>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  );
}
