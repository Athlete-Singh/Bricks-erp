import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * A home page band: the same side gutters, max width and vertical rhythm
 * everywhere. `background` (a BrickBackground and any effects) is layered
 * behind the content inside an isolated stacking context.
 */
export function Section({
  id,
  children,
  className,
  innerClassName,
  background,
  'aria-label': ariaLabel,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  background?: ReactNode;
  'aria-label'?: string;
}) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={cn('relative isolate overflow-hidden py-16 sm:py-24 lg:py-28', className)}
    >
      {background}
      <div className={cn('relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', innerClassName)}>{children}</div>
    </section>
  );
}
