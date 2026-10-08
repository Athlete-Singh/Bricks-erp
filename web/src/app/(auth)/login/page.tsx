'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSpinner } from '@/components/ui/spinner';
import { LoginForm } from '@/features/auth/components/login-form';
import { useRestoreSession, useSession } from '@/features/auth/use-auth';

export default function LoginPage() {
  // A visitor here may still hold a valid refresh token from a previous visit.
  useRestoreSession();
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  // The form renders while the restore is still running, rather than waiting on
  // it: most visitors to /login have no session, and server and client must
  // agree on this first render or React reports a hydration mismatch.
  if (status === 'authenticated') return <PageSpinner label="Taking you to the dashboard…" />;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
          B
        </span>
        <CardTitle className="mt-2">Sign in to BRICS</CardTitle>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
