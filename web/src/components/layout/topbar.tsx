'use client';

import { Bell } from 'lucide-react';
import { useHealth } from '@/features/system/use-health';
import { cn } from '@/lib/cn';

export function Topbar() {
  const { data, isError } = useHealth();

  const dbUp = !isError && data?.data?.db === 'up';

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
      <div />

      <div className="flex items-center gap-3">
        {/* DB status dot */}
        <span
          className={cn('flex items-center gap-1.5 text-xs text-muted-foreground')}
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

        <button
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
