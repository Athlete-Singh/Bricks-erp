'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Lock, Truck } from 'lucide-react';
import { guards } from '@/lib/marketing-content';
import { cn } from '@/lib/cn';
import { formatIndian } from '../ui/count-up';

type Cards = (typeof guards)['cards'];
type CardOf<K extends Cards[number]['key']> = Extract<Cards[number], { key: K }>;

/** Each visual plays its "alert" when `active` (hover, focus or tap on its card). */

export function FunnelVisual({ card, active }: { card: CardOf<'loss'>; active: boolean }) {
  const top = card.funnel[0]!.value;
  // The loss the owner can act on: bricks that went into the kiln but did not come out sellable.
  const fired = card.funnel[card.funnel.length - 2]!.value;
  const sorted = card.funnel[card.funnel.length - 1]!.value;
  const lost = fired - sorted;
  return (
    <div className="grid gap-1.5">
      {card.funnel.map((f, i) => (
        <div key={f.label} className="grid grid-cols-[3.5rem_1fr] items-center gap-2 text-xs">
          <span className="text-mk-muted">{f.label}</span>
          <div className="h-5 overflow-hidden rounded-md bg-mk-bg">
            <motion.div
              className={cn(
                'flex h-full items-center justify-end rounded-md pr-1.5 text-[10px] font-semibold text-white',
                i === 0 ? 'bg-mk-primary' : 'bg-mk-primary/80',
              )}
              initial={false}
              animate={{ width: active ? `${(f.value / top) * 100}%` : '100%' }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
            >
              {formatIndian(f.value)}
            </motion.div>
          </div>
        </div>
      ))}
      <p className={cn('mt-1 text-xs font-bold transition-colors', active ? 'text-mk-red' : 'text-mk-muted')}>
        {formatIndian(lost)} lost = {Math.round((lost / fired) * 100)}%
      </p>
    </div>
  );
}

export function GaugeVisual({ card, active }: { card: CardOf<'coal'>; active: boolean }) {
  const max = card.normalKg * 1.6;
  const value = active ? card.actualKg : card.normalKg;
  const angle = -90 + (Math.min(value, max) / max) * 180;
  const over = Math.round(((card.actualKg - card.normalKg) / card.normalKg) * 100);
  const alarm = active && over >= card.thresholdPercent;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 120 70" className="h-16 w-28 shrink-0" aria-hidden>
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
          initial={false}
          animate={{ rotate: angle }}
          transition={{ type: 'spring', stiffness: 70, damping: 12 }}
          style={{ originX: '60px', originY: '62px' }}
        >
          <line x1="60" y1="62" x2="60" y2="20" stroke="rgb(var(--mk-text))" strokeWidth="3" strokeLinecap="round" />
        </motion.g>
        <circle cx="60" cy="62" r="5" fill="rgb(var(--mk-text))" />
      </svg>
      <div className="text-xs">
        <p className="text-mk-muted">Normal {card.normalKg} kg</p>
        <p className={cn('text-base font-bold tabular-nums transition-colors', alarm ? 'text-mk-red' : 'text-mk-text')}>
          {value} kg
        </p>
        <p className={cn('font-semibold transition-colors', alarm ? 'text-mk-red' : 'text-mk-primary')}>
          {alarm ? `${over}% above normal` : 'Normal'}
        </p>
      </div>
    </div>
  );
}

export function SardarVisual({ card, active }: { card: CardOf<'sardar'>; active: boolean }) {
  const level = (a: number, w: number) =>
    a / w > guards.meter.highFrom ? 'bad' : a / w > guards.meter.watchFrom ? 'warn' : 'good';
  const colour = { good: 'bg-mk-primary', warn: 'bg-mk-amber', bad: 'bg-mk-red' } as const;
  return (
    <ul className="grid gap-1.5">
      {card.sardars.map((s, i) => {
        const l = level(s.advance, s.work);
        return (
          <li key={s.name} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 text-xs">
            <span className="font-medium text-mk-text">{s.name}</span>
            <span className="h-2 overflow-hidden rounded-full bg-mk-bg">
              <motion.span
                className={cn('block h-full rounded-full', active ? colour[l] : 'bg-slate-300')}
                initial={false}
                animate={{ width: active ? `${Math.min(100, (s.advance / s.work) * 60)}%` : '35%' }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              />
            </span>
            <span className={cn('h-2 w-2 rounded-full transition-colors', active ? colour[l] : 'bg-slate-300')} />
          </li>
        );
      })}
      <li className="text-[11px] text-mk-muted">Advance ÷ work done</li>
    </ul>
  );
}

export function GateVisual({ card, active }: { card: CardOf<'gate'>; active: boolean }) {
  const reduce = useReducedMotion();
  const unbilled = card.trucksOut - card.invoiced;
  return (
    <div>
      <div className="relative h-12 overflow-hidden rounded-lg bg-mk-bg">
        <div className="absolute bottom-2 left-0 right-0 border-t-2 border-dashed border-mk-border" aria-hidden />
        <div className="absolute bottom-0 right-8 top-1 w-1.5 rounded bg-mk-muted/60" aria-hidden />
        <motion.div
          className="absolute right-[2.4rem] top-1 h-1.5 w-12 origin-right rounded bg-mk-brick"
          initial={false}
          animate={{ rotate: active ? -70 : 0 }}
          transition={{ duration: 0.4 }}
          aria-hidden
        />
        <motion.div
          className="absolute bottom-2.5"
          initial={false}
          animate={{ left: active ? '110%' : '8%' }}
          transition={{ duration: reduce ? 0 : 1.6, ease: 'easeIn', delay: active ? 0.3 : 0 }}
        >
          <Truck className={cn('h-7 w-7', active ? 'text-mk-red' : 'text-mk-text')} aria-hidden />
        </motion.div>
      </div>
      <p className="mt-2 flex justify-between text-xs">
        <span className="text-mk-muted">
          {card.trucksOut} out · {card.invoiced} billed
        </span>
        <span className={cn('font-bold transition-colors', active ? 'text-mk-red' : 'text-mk-muted')}>
          {unbilled} unbilled
        </span>
      </p>
    </div>
  );
}

export function AuditVisual({ card, active }: { card: CardOf<'audit'>; active: boolean }) {
  return (
    <ul className="grid gap-1.5">
      {card.entries.map((e, i) => (
        <motion.li
          key={e.what}
          className="flex items-center justify-between gap-2 rounded-lg border border-mk-border bg-white px-2.5 py-1.5 text-xs"
          initial={false}
          animate={{ x: active ? 0 : i === 0 ? 0 : 6, opacity: active || i === 0 ? 1 : 0.6 }}
          transition={{ duration: 0.3, delay: i * 0.1 }}
        >
          <span className="min-w-0 truncate">
            <span className="font-semibold text-mk-text">{e.who}</span> <span className="text-mk-muted">{e.what}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-mk-muted">
            {e.when}
            <Lock className={cn('h-3 w-3 transition-colors', active && 'text-mk-primary')} aria-hidden />
          </span>
        </motion.li>
      ))}
    </ul>
  );
}
