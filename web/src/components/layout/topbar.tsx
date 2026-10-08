'use client';

import { Menu } from 'lucide-react';
import { useHealth } from '@/features/system/use-health';
import { useUiStore } from '@/stores/ui-store';
import { cn } from '@/lib/cn';
import { CompanySwitcher } from './company-switcher';
import { KilnSwitcher } from './kiln-switcher';
import { UserMenu } from './user-menu';

export function Topbar() {
  const { data, isError } = useHealth();
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const dbUp = !isError && data?.db === 'up';

  return (
    <header className="flex h-14 items-center justify-between gap-2 border-b border-border bg-surface px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        {/* The sidebar is a drawer below `md`, so it needs a way in. */}
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <CompanySwitcher />
        <KilnSwitcher />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Database reachability — the one thing worth surfacing everywhere,
            because an entry that silently fails in the field is worse than a
            visible warning. */}
        <span
          className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex"
          title={dbUp ? 'Database connected' : 'Database unreachable'}
        >
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              dbUp ? 'bg-success' : isError ? 'bg-danger' : 'bg-warning animate-pulse',
            )}
          />
          {dbUp ? 'DB connected' : isError ? 'DB down' : 'Checking…'}
        </span>

        <UserMenu />
      </div>
    </header>
  );
}
