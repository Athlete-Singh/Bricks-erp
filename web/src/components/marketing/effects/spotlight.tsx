'use client';

import { useEffect, useRef, useState } from 'react';
import { useFinePointer, useLowPower, useMotionOk } from './hooks';
import { mk, wallTile } from './patterns';

/**
 * Bricks near the cursor glow: a brighter copy of the wall, shown only inside
 * a soft circle that follows the mouse across the parent section. Mouse and
 * trackpad only — nothing renders on touch, weak devices or reduced motion.
 */
export function CursorSpotlight({ tone = 'green' }: { tone?: 'green' | 'white' }) {
  const ref = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const low = useLowPower();
  const motionOk = useMotionOk();
  const enabled = fine && !low && motionOk;
  const [active, setActive] = useState(false);

  useEffect(() => {
    const layer = ref.current;
    const host = layer?.parentElement;
    if (!enabled || !layer || !host) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = host.getBoundingClientRect();
        layer.style.setProperty('--mx', `${e.clientX - r.left}px`);
        layer.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
      setActive(true);
    };
    const leave = () => setActive(false);
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
    };
  }, [enabled]);

  if (!enabled) return null;
  const mask = 'radial-gradient(220px circle at var(--mx) var(--my), #000 0%, transparent 70%)';
  const white = tone === 'white';
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-[5] transition-opacity duration-500"
      style={{ opacity: active ? 1 : 0, maskImage: mask, WebkitMaskImage: mask }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: wallTile(white ? mk.white : mk.primary, white ? 0.35 : 0.22),
          backgroundColor: white ? 'rgb(255 255 255 / 0.06)' : 'rgb(45 106 67 / 0.05)',
        }}
      />
    </div>
  );
}
