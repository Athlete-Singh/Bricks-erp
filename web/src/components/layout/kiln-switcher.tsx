'use client';

import { ChevronDown, Flame } from 'lucide-react';

export function KilnSwitcher() {
  return (
    <button
      className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-surface-muted"
      disabled
      title="Kiln selection — available after login (P1)"
    >
      <Flame className="h-3.5 w-3.5 text-warning" />
      <span>Select kiln</span>
      <ChevronDown className="h-3 w-3 text-muted-foreground" />
    </button>
  );
}
