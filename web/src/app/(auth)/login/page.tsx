'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSpinner } from '@/components/ui/spinner';
import { LoginForm } from '@/features/auth/components/login-form';
import { useRestoreSession, useSession } from '@/features/auth/use-auth';
import { Logo } from '@/components/brand/logo';
import { brandConfig } from '@/lib/brand';

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
        <Logo variant="stacked" size="lg" animated priority className="mx-auto mb-2" />
        <CardTitle className="mt-2 text-center">Sign in to {brandConfig.productName}</CardTitle>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
