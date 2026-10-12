'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { cn } from '@/lib/cn';

const TABS = [
  { label: 'Attendance', href: '/labour/attendance' },
  { label: 'Advances', href: '/labour/advances' },
  { label: 'Groups & Workers', href: '/labour/groups' },
  { label: 'Deductions', href: '/labour/deductions' },
  { label: 'Settlements', href: '/labour/settlements' },
  { label: 'Exposure (LEK-03)', href: '/labour/exposure' },
];

export default function LabourLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Labour & Sardar"
        description="Attendance register, advances, wage rates, settlements, and advance exposure"
      />

      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1" aria-label="Labour navigation tabs">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-[44px] items-center whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-primary font-semibold text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
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
