'use client';

import { useReducedMotion } from 'framer-motion';
import { useEffect, useState, type RefObject } from 'react';

function useMedia(query: string): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatch(mq.matches);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** A mouse or trackpad: hover effects (spotlight, tilt) make sense. False on touch. */
export function useFinePointer(): boolean {
  return useMedia('(hover: hover) and (pointer: fine)');
}

/** Small screen or a weak device: fewer particles, no tilt or spotlight. */
export function useLowPower(): boolean {
  const small = useMedia('(max-width: 767px)');
  const [weak, setWeak] = useState(false);
  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    setWeak((nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4);
  }, []);
  return small || weak;
}

/** Motion is welcome: the visitor has not asked to reduce it. */
export function useMotionOk(): boolean {
  return useReducedMotion() !== true;
}

/** Whether the element is near the viewport — used to pause animations off-screen. */
export function useOnScreen(ref: RefObject<Element | null>, margin = '200px'): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(e?.isIntersecting ?? false), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return on;
}
