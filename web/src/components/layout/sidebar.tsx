'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Flame,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { PERMISSIONS } from '@brics/shared';
import { useSession } from '@/features/auth/use-auth';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/ui-store';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Every code must be held for the item to appear. */
  permissions?: string[];
  /** The route does not exist yet — shown greyed out rather than as a dead link. */
  comingIn?: string;
}

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Production', href: '/production', icon: Flame, comingIn: 'P5' },
  { label: 'Labour', href: '/labour', icon: Users, comingIn: 'P6' },
  { label: 'Purchases', href: '/purchases', icon: ShoppingCart, comingIn: 'P7' },
  { label: 'Dispatch', href: '/dispatch', icon: Truck, comingIn: 'P9' },
  { label: 'Accounts', href: '/accounts', icon: BookOpen, permissions: [PERMISSIONS.ACCOUNTS_VIEW] },
  { label: 'Reports', href: '/reports', icon: BarChart2, comingIn: 'P11' },
  { label: 'Audit log', href: '/audit-logs', icon: ScrollText, permissions: [PERMISSIONS.AUDIT_VIEW] },
  { label: 'Settings', href: '/settings', icon: Settings, permissions: [PERMISSIONS.COMPANY_VIEW] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, mobileNavOpen, setMobileNavOpen } = useUiStore();
  const { can } = useSession();

  const items = NAV.filter((item) => !item.permissions || can(...item.permissions));

  // Any navigation on a phone should close the drawer behind it.
  const closeOnMobile = () => setMobileNavOpen(false);

  return (
    <>
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeOnMobile}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      <aside
        className={cn(
          'flex h-full flex-col border-r border-border bg-surface',
          // Phone: a drawer over the content. Tablet and up: part of the layout.
          'fixed inset-y-0 left-0 z-40 w-64 transition-transform duration-200 md:relative md:z-auto md:w-auto md:translate-x-0 md:transition-[width]',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
          'md:shrink-0',
          sidebarOpen ? 'md:w-56' : 'md:w-14',
        )}
      >
        <div className="flex h-14 items-center gap-2 px-3 font-semibold text-foreground">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">
            B
          </span>
          <span className={cn('truncate text-sm', !sidebarOpen && 'md:hidden')}>BRICS</span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
          {items.map(({ label, href, icon: Icon, comingIn }) => {
            const active = pathname.startsWith(href);

            if (comingIn) {
              return (
                <span
                  key={href}
                  title={`Available in ${comingIn}`}
                  aria-disabled
                  className="flex h-9 cursor-not-allowed items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground/50"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className={cn('truncate', !sidebarOpen && 'md:hidden')}>{label}</span>
                  <span className={cn('ml-auto text-[10px] font-medium uppercase', !sidebarOpen && 'md:hidden')}>
                    {comingIn}
                  </span>
                </span>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={closeOnMobile}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-9 items-center gap-2.5 rounded-md px-2 text-sm transition-colors',
                  active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className={cn('truncate', !sidebarOpen && 'md:hidden')}>{label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-16 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-surface shadow-sm hover:bg-surface-muted md:flex"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      </aside>
    </>
  );
}
