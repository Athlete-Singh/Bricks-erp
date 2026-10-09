'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PERMISSIONS } from '@brics/shared';
import { PageHeader } from '@/components/layout/page-header';
import { buttonVariants } from '@/components/ui/button';
import { useSession } from '@/features/auth/use-auth';
import { cn } from '@/lib/cn';

const TABS = [
  { label: 'Day Book', href: '/accounts/day-book' },
  { label: 'Ledgers', href: '/accounts/ledgers' },
  { label: 'Trial Balance', href: '/accounts/trial-balance' },
];

export default function AccountsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can } = useSession();

  // The entry form is a page of its own, not a tab.
  const isEntry = pathname.startsWith('/accounts/vouchers');

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Accounts"
        description="Vouchers and the books — every entry posts a balanced journal"
        actions={
          !isEntry && can(PERMISSIONS.ACCOUNTS_MANAGE) ? (
            // A link, not a button: "New voucher" navigates, so it should be
            // middle-clickable and open in a new tab like any other link.
            <Link href="/accounts/vouchers/new" className={buttonVariants({ size: 'sm' })}>
              <Plus className="h-4 w-4" aria-hidden />
              New voucher
            </Link>
          ) : undefined
        }
      />

      {!isEntry && (
        <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1" aria-label="Accounts sections">
          {TABS.map((tab) => {
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
      )}

      {children}
    </div>
  );
}
