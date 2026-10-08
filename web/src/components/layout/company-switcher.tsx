'use client';

import { Building2, Check, ChevronDown } from 'lucide-react';
import { Dropdown, DropdownItem, DropdownLabel } from '@/components/ui/dropdown';
import { Spinner } from '@/components/ui/spinner';
import { useMyCompanies, useSwitchCompany } from '@/features/company/hooks';
import { useSession } from '@/features/auth/use-auth';

/**
 * ADM-02. Switching re-issues the session from `POST /auth/switch-company`, so
 * the company id in the JWT changes and every later request is scoped to the
 * new tenant. Hidden when the user belongs to a single company.
 */
export function CompanySwitcher() {
  const { company } = useSession();
  const { data: companies, isLoading } = useMyCompanies();
  const switchCompany = useSwitchCompany();

  if (!company) return null;
  if (!isLoading && (companies?.length ?? 0) < 2) return null;

  return (
    <Dropdown
      label="Switch company"
      trigger={({ open }) => (
        <span className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-surface-muted">
          <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span className="max-w-[10rem] truncate">{company.name}</span>
          {switchCompany.isPending ? (
            <Spinner className="h-3 w-3" />
          ) : (
            <ChevronDown
              className={`h-3 w-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden
            />
          )}
        </span>
      )}
    >
      {({ close }) => (
        <>
          <DropdownLabel>Companies</DropdownLabel>
          {companies?.map((item) => (
            <DropdownItem
              key={item.id}
              active={item.id === company.id}
              disabled={switchCompany.isPending}
              onSelect={() => {
                close();
                if (item.id !== company.id) switchCompany.mutate({ companyId: item.id });
              }}
            >
              <Check className={`h-3.5 w-3.5 ${item.id === company.id ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
              <span className="truncate">{item.name}</span>
            </DropdownItem>
          ))}
        </>
      )}
    </Dropdown>
  );
}
