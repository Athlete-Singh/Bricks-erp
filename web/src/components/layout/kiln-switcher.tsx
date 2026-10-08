'use client';

import { Check, ChevronDown, Flame } from 'lucide-react';
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from '@/components/ui/dropdown';
import { useSession } from '@/features/auth/use-auth';
import { useAuthStore } from '@/stores/auth-store';

/**
 * ADM-03. Picks the kiln the rest of the app filters by. The list comes from
 * `GET /sites`, which already returns only the kilns this user may work on, so
 * no client-side filtering is needed — or trusted.
 *
 * "All kilns" (`activeSiteId === null`) is a real choice, not an empty state:
 * an owner usually wants the whole company.
 */
export function KilnSwitcher() {
  const { sites, activeSiteId } = useSession();
  const setActiveSite = useAuthStore((s) => s.setActiveSite);

  if (sites.length === 0) return null;

  const active = sites.find((s) => s.id === activeSiteId);
  const activeLabel = active ? active.name : 'All kilns';

  return (
    <Dropdown
      label="Select kiln"
      trigger={({ open }) => (
        <span className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-surface-muted">
          <Flame className="h-3.5 w-3.5 text-warning" aria-hidden />
          <span className="max-w-[9rem] truncate">{activeLabel}</span>
          <ChevronDown
            className={`h-3 w-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </span>
      )}
    >
      {({ close }) => (
        <>
          <DropdownLabel>Kilns</DropdownLabel>
          <DropdownItem
            active={activeSiteId === null}
            onSelect={() => {
              setActiveSite(null);
              close();
            }}
          >
            <Check className={`h-3.5 w-3.5 ${activeSiteId === null ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
            All kilns
          </DropdownItem>

          <DropdownSeparator />

          {sites.map((site) => (
            <DropdownItem
              key={site.id}
              active={site.id === activeSiteId}
              onSelect={() => {
                setActiveSite(site.id);
                close();
              }}
            >
              <Check className={`h-3.5 w-3.5 ${site.id === activeSiteId ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
              <span className="truncate">{site.name}</span>
              <span className="ml-auto text-[11px] text-muted-foreground">{site.code}</span>
            </DropdownItem>
          ))}
        </>
      )}
    </Dropdown>
  );
}
