'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { PERMISSIONS } from '@brics/shared';
import { PageSpinner } from '@/components/ui/spinner';
import { useSession } from '../use-auth';

/**
 * A kiln-side route a platform admin should not see. The AuthGuard above has
 * already made sure the user is signed in; this one sends a platform admin
 * to `/admin` so the shell they land on matches their job.
 *
 * UX only — the API refuses the business endpoints to a platform admin
 * anyway (ADR-052).
 */
export function PlatformAdminBounce({ children }: { children: ReactNode }) {
  const { can } = useSession();
  const router = useRouter();
  const isPlatformAdmin = can(PERMISSIONS.PLATFORM_TENANTS_VIEW);

  useEffect(() => {
    if (isPlatformAdmin) router.replace('/admin');
  }, [isPlatformAdmin, router]);

  if (isPlatformAdmin) return <PageSpinner label="Redirecting to the admin panel…" />;
  return <>{children}</>;
}
