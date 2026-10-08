'use client';

import { useSites } from '@/features/company/hooks';
import { Spinner } from '@/components/ui/spinner';

interface KilnAccessFieldProps {
  value: string[];
  onChange: (siteIds: string[]) => void;
  disabled?: boolean;
}

/**
 * Which kilns a user may work on. Checkboxes rather than a multi-select: a
 * supervisor's manager picks these on a phone as often as a desktop.
 *
 * Empty means **all kilns of the company** — that is the backend rule
 * (`CompanyService.accessibleSites`), so it is stated here rather than left to
 * be discovered.
 */
export function KilnAccessField({ value, onChange, disabled }: KilnAccessFieldProps) {
  const { data: sites, isLoading } = useSites();

  const toggle = (siteId: string) => {
    onChange(value.includes(siteId) ? value.filter((id) => id !== siteId) : [...value, siteId]);
  };

  return (
    <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
      <legend className="text-xs font-medium text-muted-foreground">Kiln access</legend>

      {isLoading && <Spinner label="Loading kilns…" />}

      {!isLoading && (sites?.length ?? 0) === 0 && (
        <p className="text-xs text-muted-foreground">No kilns yet — add one in Settings → Kilns.</p>
      )}

      {sites?.map((site) => (
        <label
          key={site.id}
          className="flex min-h-[2.25rem] cursor-pointer items-center gap-2 rounded-md px-1 text-sm hover:bg-surface-muted"
        >
          <input
            type="checkbox"
            checked={value.includes(site.id)}
            onChange={() => toggle(site.id)}
            className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
          />
          <span className="truncate">{site.name}</span>
          <span className="ml-auto text-[11px] text-muted-foreground">{site.code}</span>
        </label>
      ))}

      {value.length === 0 && (sites?.length ?? 0) > 0 && (
        <p className="text-xs text-muted-foreground">Nothing selected — the user gets access to every kiln.</p>
      )}
    </fieldset>
  );
}
