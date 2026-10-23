'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * A pulsing dot that explains the thing next to it. Hover or focus shows the
 * tip; a tap toggles it, since phones have no hover.
 */
export function Hotspot({
  tip,
  className,
  side = 'top',
}: {
  tip: string;
  className?: string;
  side?: 'top' | 'bottom';
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className={cn('group/hs relative inline-flex', className)}>
      <button
        type="button"
        aria-label={tip}
        aria-describedby={id}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        className="relative flex h-5 w-5 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary"
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mk-amber opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mk-amber ring-2 ring-white" />
      </button>
      <span
        id={id}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-20 w-56 -translate-x-1/2 rounded-lg bg-mk-text px-3 py-2 text-xs font-medium leading-snug text-white shadow-mk-device transition-opacity duration-150',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          open ? 'opacity-100' : 'opacity-0 group-hover/hs:opacity-100 group-focus-within/hs:opacity-100',
        )}
      >
        {tip}
      </span>
    </span>
  );
}
