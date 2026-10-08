import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2">
      <Loader2 className={cn('h-4 w-4 animate-spin', className)} aria-hidden />
      <span className={label ? 'text-sm text-muted-foreground' : 'sr-only'}>{label ?? 'Loading'}</span>
    </span>
  );
}

/** Full-height centred spinner, for a route that cannot render until data lands. */
export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}
