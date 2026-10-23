'use client';

import { Logo } from '@/components/brand/logo';

export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <Logo variant="stacked" size="lg" />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">Nothing you saved is lost. Please try again.</p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Try again
      </button>
    </main>
  );
}
