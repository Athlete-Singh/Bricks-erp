import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'green' | 'brick' | 'amber' | 'red' | 'blue' | 'neutral';

const tones: Record<BadgeTone, string> = {
  green: 'bg-mk-primary-soft text-mk-primary',
  brick: 'bg-mk-brick-soft text-mk-brick',
  amber: 'bg-mk-amber-soft text-amber-800',
  red: 'bg-mk-red-soft text-mk-red',
  blue: 'bg-blue-50 text-blue-700',
  neutral: 'bg-slate-100 text-mk-muted',
};

export function Badge({
  children,
  tone = 'green',
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
