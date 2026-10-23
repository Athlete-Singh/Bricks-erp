'use client';

import { useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** 121200 → "1,21,200": Indian digit grouping. */
export function formatIndian(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * A number that counts up when it scrolls into view. The server renders the
 * final value (readable without JavaScript, and for search engines); the
 * client resets it to the start just before paint and rolls it up.
 */
export function CountUp({
  value,
  from = 0,
  duration = 1.6,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  value: number;
  from?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);

  useIsoLayoutEffect(() => {
    if (!reduce) setShown(from);
  }, [reduce, from]);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    if (!inView) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (value - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduce, value, from, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatIndian(shown, decimals)}
      {suffix}
    </span>
  );
}
