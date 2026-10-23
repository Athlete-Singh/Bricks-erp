'use client';

import { useRef, type HTMLAttributes, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useFinePointer, useLowPower, useMotionOk } from '../effects/hooks';

const MAX_TILT = 5;

/**
 * Glass card: translucent white over the brick backdrop, a soft green shadow.
 * With `lift` it rises on hover and focus, tilts a few degrees toward a mouse
 * cursor and shows an animated gradient ring. Tilt is off on touch, weak
 * devices and reduced motion.
 */
export function Card({
  children,
  className,
  lift = true,
  ...rest
}: { children: ReactNode; className?: string; lift?: boolean } & HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const low = useLowPower();
  const motionOk = useMotionOk();
  const tilt = lift && fine && !low && motionOk;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!tilt || !el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) translateY(-4px) rotateX(${(-py * MAX_TILT).toFixed(2)}deg) rotateY(${(px * MAX_TILT).toFixed(2)}deg)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn(
        'group relative rounded-mk border border-mk-border/80 bg-white/80 p-6 shadow-mk-soft backdrop-blur-md',
        lift &&
          'transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-mk-lift focus-within:-translate-y-1 focus-within:shadow-mk-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
      {...rest}
    >
      {lift && <span className="mk-ring" aria-hidden />}
      {children}
    </div>
  );
}
