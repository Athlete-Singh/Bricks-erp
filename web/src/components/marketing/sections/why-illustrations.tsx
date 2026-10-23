'use client';

import { motion } from 'framer-motion';
import { Truck } from 'lucide-react';

/**
 * Small looping pictures of each money leak. `play` is false off-screen and
 * with reduced motion, which freezes them on a readable frame.
 */

const loop = (play: boolean, duration: number, delay = 0) =>
  play ? { duration, delay, repeat: Infinity, ease: 'easeInOut' as const, repeatDelay: 0.6 } : { duration: 0 };

export function AdvanceBars({ play }: { play: boolean }) {
  return (
    <div className="grid w-full gap-2 text-[11px]">
      {[
        { label: 'Advance', to: 1, className: 'bg-mk-brick' },
        { label: 'Work done', to: 0.62, className: 'bg-mk-primary' },
      ].map((b) => (
        <div key={b.label} className="grid grid-cols-[4.5rem_1fr] items-center gap-2">
          <span className="text-mk-muted">{b.label}</span>
          <span className="h-3 overflow-hidden rounded-full bg-mk-bg">
            <motion.span
              className={`block h-full origin-left rounded-full ${b.className}`}
              initial={false}
              animate={play ? { scaleX: [0.1, b.to, b.to, 0.1] } : { scaleX: b.to }}
              transition={loop(play, 4)}
            />
          </span>
        </div>
      ))}
      <p className="text-right font-semibold text-mk-brick">₹28,000 more than work</p>
    </div>
  );
}

export function CoalGauge({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 120 70" className="h-20 w-32" aria-hidden>
      <path
        d="M10 62 A50 50 0 0 1 110 62"
        fill="none"
        stroke="rgb(var(--mk-border))"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M10 62 A50 50 0 0 1 60 12"
        fill="none"
        stroke="rgb(var(--mk-primary))"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path d="M60 12 A50 50 0 0 1 95 27" fill="none" stroke="rgb(var(--mk-amber))" strokeWidth="10" />
      <path
        d="M95 27 A50 50 0 0 1 110 62"
        fill="none"
        stroke="rgb(var(--mk-red))"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <motion.g
        style={{ originX: '60px', originY: '62px' }}
        initial={false}
        animate={play ? { rotate: [-60, 10, 62, 62, -60] } : { rotate: 62 }}
        transition={loop(play, 5)}
      >
        <line x1="60" y1="62" x2="60" y2="20" stroke="rgb(var(--mk-text))" strokeWidth="3" strokeLinecap="round" />
      </motion.g>
      <circle cx="60" cy="62" r="5" fill="rgb(var(--mk-text))" />
    </svg>
  );
}

export function GateNoBill({ play }: { play: boolean }) {
  return (
    <div className="relative h-16 w-full overflow-hidden rounded-lg bg-mk-bg">
      <div className="absolute bottom-3 left-0 right-0 border-t-2 border-dashed border-mk-border" aria-hidden />
      <div className="absolute bottom-0 left-1/2 top-2 w-1.5 -translate-x-1/2 rounded bg-mk-muted/50" aria-hidden />
      <motion.div
        className="absolute bottom-3.5"
        initial={false}
        animate={play ? { left: ['-15%', '110%'] } : { left: '62%' }}
        transition={play ? { duration: 3.6, repeat: Infinity, ease: 'linear', repeatDelay: 0.8 } : { duration: 0 }}
      >
        <Truck className="h-8 w-8 text-mk-text" aria-hidden />
      </motion.div>
      <motion.span
        className="absolute right-2 top-1.5 rounded bg-mk-red px-1.5 py-0.5 text-[10px] font-bold text-white"
        initial={false}
        animate={play ? { opacity: [0, 0, 1, 1, 0], scale: [0.8, 0.8, 1, 1, 0.8] } : { opacity: 1 }}
        transition={play ? { duration: 4.4, repeat: Infinity, times: [0, 0.45, 0.55, 0.9, 1] } : { duration: 0 }}
      >
        No bill!
      </motion.span>
    </div>
  );
}

export function DiaryPage({ play }: { play: boolean }) {
  return (
    <div className="relative h-20 w-28 rotate-[-3deg] rounded-md border border-amber-200 bg-[#FFFBEF] p-2 shadow-sm">
      <span className="absolute inset-y-0 left-4 w-px bg-mk-brick/30" aria-hidden />
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="mb-2 ml-4 block h-px bg-sky-300/60" style={{ width: `${80 - i * 12}%` }} aria-hidden />
      ))}
      <motion.span
        className="absolute -right-3 -top-4 flex h-9 w-9 items-center justify-center rounded-full bg-mk-brick text-lg font-extrabold text-white shadow-md"
        initial={false}
        animate={play ? { y: [0, -5, 0], rotate: [0, 8, 0] } : { y: 0 }}
        transition={loop(play, 2.4)}
        aria-hidden
      >
        ?
      </motion.span>
    </div>
  );
}
