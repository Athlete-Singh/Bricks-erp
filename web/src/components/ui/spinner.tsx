import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { cn } from '@/lib/cn';

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2">
      <Loader2 className={cn('h-4 w-4 animate-spin', className)} aria-hidden />
      <span className={label ? 'text-sm text-muted-foreground' : 'sr-only'}>{label ?? 'Loading'}</span>
    </span>
  );
}

/** Full-height loader for a route that cannot render until data lands: the brand icon with its chimney smoking. */
export function PageSpinner({ label }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Logo variant="icon" size="md" animated className="animate-pulse motion-reduce:animate-none" />
      <span className="text-sm text-muted-foreground">{label ?? 'Loading'}</span>
    </div>
  );
}
