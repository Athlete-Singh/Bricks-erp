'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { cn } from '@/lib/cn';

const TABS = [
  { label: 'Company', href: '/settings/company' },
  { label: 'Kilns', href: '/settings/kilns' },
  { label: 'Financial years', href: '/settings/financial-years' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Settings" description="Company profile, kilns and financial years" />

      {/* Scrolls horizontally on a phone rather than wrapping into two rows. */}
      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1" aria-label="Settings sections">
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
