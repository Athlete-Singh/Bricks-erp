'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PERMISSIONS } from '@brics/shared';
import { PageHeader } from '@/components/layout/page-header';
import { useSession } from '@/features/auth/use-auth';
import { cn } from '@/lib/cn';

const TABS = [
  { label: 'Parties', href: '/masters/parties', permission: PERMISSIONS.PARTIES_VIEW },
  { label: 'Inventory', href: '/masters/inventory', permission: PERMISSIONS.INVENTORY_VIEW },
  { label: 'Transport', href: '/masters/transport', permission: PERMISSIONS.TRANSPORT_VIEW },
  { label: 'Taxes / HSN', href: '/masters/taxes', permission: PERMISSIONS.TAXES_VIEW },
  { label: 'Wage Rates', href: '/masters/labour', permission: PERMISSIONS.LABOUR_VIEW },
];

export default function MastersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can } = useSession();

  const visibleTabs = TABS.filter((t) => can(t.permission));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Masters" description="Configure parties, inventory items, transport, taxes and wage rates" />

      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1" aria-label="Masters sections">
        {visibleTabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors',
                active
                  ? 'border-primary font-medium text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
