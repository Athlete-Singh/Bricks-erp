'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { PageSpinner } from '@/components/ui/spinner';
import { useRestoreSession, useSession } from '../use-auth';

/**
 * Gate for every signed-in route. While a stored session is being restored it
 * renders a spinner rather than the page, so a reload does not flash the
 * dashboard shell before we know who the user is (or bounce them to /login
 * when the session was in fact valid).
 *
 * This is UX, not security — the API enforces access on every request.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  useRestoreSession();
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated') {
    return <PageSpinner label={status === 'loading' ? 'Restoring your session…' : 'Redirecting to sign in…'} />;
  }

  return <>{children}</>;
}
