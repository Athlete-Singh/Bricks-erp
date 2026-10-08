'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useLogout, useSession } from '@/features/auth/use-auth';

/**
 * Who is signed in, and a way out. Grows into a dropdown with change-password
 * and the company switcher in P1.2b.
 */
export function UserMenu() {
  const { user, company } = useSession();
  const logout = useLogout();

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right leading-tight sm:block">
        <p className="text-xs font-medium text-foreground">{user.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {company?.name ? `${company.name} · ` : ''}
          {user.roleCode.replace(/_/g, ' ')}
        </p>
      </div>

      <span
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
        aria-hidden
      >
        {user.name.charAt(0).toUpperCase()}
      </span>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        aria-label="Sign out"
        title="Sign out"
      >
        {logout.isPending ? <Spinner /> : <LogOut className="h-4 w-4" />}
      </Button>
    </div>
  );
}
