'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Building2, LogOut, HeadphonesIcon } from 'lucide-react';
import { PERMISSIONS } from '@brics/shared';
import { PageSpinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { homeRouteFor, useLogout, useRestoreSession, useSession } from '@/features/auth/use-auth';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/brand/logo';

/**
 * The platform admin's own shell. Deliberately not the kiln dashboard — the
 * language is tenants and plans, not sales and stock, because the fastest
 * way to make an admin behave like an owner is to show them an owner's
 * screen (ADR-052).
 *
 * The AuthGuard here does the normal "signed in?" check and then a second
 * one: the signed-in user must hold `platform.tenants.view`, or they are
 * bounced to the dashboard. The guard is UX only — the API refuses the
 * endpoints anyway.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  useRestoreSession();
  const { status, user, can } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    else if (status === 'authenticated' && !can(PERMISSIONS.PLATFORM_TENANTS_VIEW)) {
      router.replace(homeRouteFor(user?.permissions));
    }
  }, [status, can, user, router]);

  if (status !== 'authenticated' || !can(PERMISSIONS.PLATFORM_TENANTS_VIEW)) {
    return <PageSpinner label={status === 'loading' ? 'Restoring your session…' : 'Redirecting…'} />;
  }

  const nav: Array<{ label: string; href: string; icon: typeof Building2; comingIn?: string }> = [
    { label: 'Tenants', href: '/admin/tenants', icon: Building2 },
    // S2 — greyed out as a known-next step, same convention as the kiln
    // sidebar (comingIn tag).
    { label: 'Support sessions', href: '#', icon: HeadphonesIcon, comingIn: 'S2' },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex h-14 items-center gap-2 px-3">
          <Logo variant="horizontal" size="xs" name="product" />
          <span className="text-sm font-semibold text-muted-foreground">Admin</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-2">
          {nav.map(({ label, href, icon: Icon, comingIn }) => {
            const active = href !== '#' && pathname.startsWith(href);
            if (comingIn) {
              return (
                <span
                  key={label}
                  title={`Available in ${comingIn}`}
                  aria-disabled
                  className="flex h-9 cursor-not-allowed items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground/50"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{label}</span>
                  <span className="ml-auto text-[10px] font-medium uppercase">{comingIn}</span>
                </span>
              );
            }
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-9 items-center gap-2.5 rounded-md px-2 text-sm transition-colors',
                  active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3 text-xs text-muted-foreground">
          <p className="truncate">Signed in as</p>
          <p className="truncate font-medium text-foreground">{user?.name}</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
          <h1 className="text-sm font-semibold text-foreground">Platform</h1>
          <Button
            size="sm"
            variant="outline"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
