'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { cn } from '@/lib/cn';

const TABS = [
  { label: 'Expenses', href: '/reports/expenses' },
  { label: 'Cash & bank', href: '/reports/cash-bank' },
  { label: 'P&L / Balance Sheet', href: '/reports/statements' },
  { label: 'GST', href: '/reports/gst' },
];

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Accounts & reports"
        description="What the kiln spent, what is in the drawer and the bank, what it earned, and what is owed to GST"
      />
      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1" aria-label="Report views">
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
      {children}
    </div>
  );
}
