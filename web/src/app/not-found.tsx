import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <Logo variant="stacked" size="lg" animated />
      <div>
        <h1 className="text-2xl font-bold text-foreground">This page is not here</h1>
        <p className="mt-2 text-muted-foreground">The link may be old, or the page has moved.</p>
      </div>
      <div className="flex gap-3">
        <Link href="/" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Go to home page
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground"
        >
          Open dashboard
        </Link>
      </div>
    </main>
  );
}
