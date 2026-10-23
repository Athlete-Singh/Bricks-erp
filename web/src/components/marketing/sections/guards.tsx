'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { BellRing, Flame, Layers, RotateCcw, ScrollText, Truck, UserRoundCheck, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { guards } from '@/lib/marketing-content';
import { cn } from '@/lib/cn';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { formatIndian } from '../ui/count-up';
import { MeshBlobs } from '../effects/ambient';
import { BrickBackground } from '../effects/brick-background';
import { Reveal } from '../ui/reveal';
import { Section } from '../ui/section';
import { SectionHeading } from '../ui/section-heading';
import { AuditVisual, FunnelVisual, GateVisual, GaugeVisual, SardarVisual } from './guard-visuals';

type GuardCard = (typeof guards)['cards'][number];

const icons: Record<GuardCard['key'], LucideIcon> = {
  loss: Layers,
  coal: Flame,
  sardar: UserRoundCheck,
  gate: Truck,
  audit: ScrollText,
};

function Visual({ card, active }: { card: GuardCard; active: boolean }) {
  switch (card.key) {
    case 'loss':
      return <FunnelVisual card={card} active={active} />;
    case 'coal':
      return <GaugeVisual card={card} active={active} />;
    case 'sardar':
      return <SardarVisual card={card} active={active} />;
    case 'gate':
      return <GateVisual card={card} active={active} />;
    case 'audit':
      return <AuditVisual card={card} active={active} />;
  }
}

/** Each guard has its own tint so the five read as five different jobs; green stays the brand. */
const accents: Record<GuardCard['key'], { bar: string; soft: string; solid: string; tint: string }> = {
  loss: {
    bar: 'from-mk-primary to-emerald-400',
    soft: 'bg-mk-primary-soft text-mk-primary',
    solid: 'bg-mk-primary text-white',
    tint: 'from-mk-primary-soft/60',
  },
  coal: {
    bar: 'from-mk-amber to-orange-400',
    soft: 'bg-mk-amber-soft text-amber-800',
    solid: 'bg-amber-500 text-white',
    tint: 'from-mk-amber-soft/70',
  },
  sardar: {
    bar: 'from-mk-brick to-rose-400',
    soft: 'bg-mk-brick-soft text-mk-brick',
    solid: 'bg-mk-brick text-white',
    tint: 'from-mk-brick-soft/70',
  },
  gate: {
    bar: 'from-teal-500 to-cyan-400',
    soft: 'bg-teal-50 text-teal-700',
    solid: 'bg-teal-600 text-white',
    tint: 'from-teal-50/80',
  },
  audit: {
    bar: 'from-slate-500 to-slate-400',
    soft: 'bg-slate-100 text-slate-700',
    solid: 'bg-slate-700 text-white',
    tint: 'from-slate-100/80',
  },
};

function GuardTile({ card }: { card: GuardCard }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const active = hover || pinned;
  const Icon = icons[card.key];
  const accent = accents[card.key];
  return (
    <button
      type="button"
      aria-pressed={pinned}
      onClick={() => setPinned((p) => !p)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className={cn(
        'group relative flex h-full w-full flex-col overflow-hidden rounded-mk border bg-gradient-to-b to-white/90 p-5 text-left shadow-mk-soft backdrop-blur-md transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary motion-reduce:transition-none',
        accent.tint,
        active
          ? '-translate-y-1 border-mk-primary/30 shadow-mk-lift motion-reduce:translate-y-0'
          : 'border-mk-border/80',
      )}
    >
      <span className="mk-ring" aria-hidden />
      <span className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', accent.bar)} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-2xl transition-colors',
            active ? accent.solid : accent.soft,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <Badge tone="neutral">{card.code}</Badge>
      </div>
      <h3 className="mt-4 text-lg font-bold text-mk-text">{card.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-mk-muted">{card.problem}</p>
      <div className="my-4 flex-1 rounded-xl border border-mk-border/80 bg-white/80 p-3">
        <Visual card={card} active={active} />
      </div>
      <p className="flex items-start gap-2 text-sm text-mk-text">
        <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-mk-brick" aria-hidden />
        <span>
          <span className="font-semibold">{guards.alertLabel}</span> {card.alert}
        </span>
      </p>
      <span className="mt-3 text-xs font-medium text-mk-muted lg:hidden">{guards.tapHint}</span>
    </button>
  );
}

type Level = keyof typeof guards.meter.levels;

const glow: Record<Level, string> = {
  safe: 'shadow-[0_0_18px_2px_rgb(45_106_67/0.35)]',
  watch: 'shadow-[0_0_18px_2px_rgb(245_181_68/0.5)]',
  high: 'shadow-[0_0_20px_3px_rgb(196_48_43/0.45)]',
};

function levelOf(advance: number, work: number): Level {
  const { watchFrom, highFrom } = guards.meter;
  if (work <= 0) return advance > 0 ? 'high' : 'safe';
  const ratio = advance / work;
  if (ratio > highFrom) return 'high';
  if (ratio > watchFrom) return 'watch';
  return 'safe';
}

const levelStyle: Record<Level, { text: string; bg: string; badge: 'green' | 'amber' | 'red' }> = {
  safe: { text: 'text-mk-primary', bg: 'bg-mk-primary', badge: 'green' },
  watch: { text: 'text-amber-800', bg: 'bg-mk-amber', badge: 'amber' },
  high: { text: 'text-mk-red', bg: 'bg-mk-red', badge: 'red' },
};

function Slider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const { max, step } = guards.meter;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-mk-text">
          {label}
        </label>
        <span className="text-lg font-bold tabular-nums text-mk-text">₹{formatIndian(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`₹${formatIndian(value)}`}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-mk-border accent-mk-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary focus-visible:ring-offset-2"
      />
    </div>
  );
}

function RiskMeter() {
  const m = guards.meter;
  const reduce = useReducedMotion();
  const [advance, setAdvance] = useState<number>(m.initialAdvance);
  const [work, setWork] = useState<number>(m.initialWork);
  const level = levelOf(advance, work);
  const style = levelStyle[level];
  // Needle: ratio 0 → left edge, 2 (twice the work) or more → right edge.
  const ratio = work > 0 ? advance / work : advance > 0 ? 2 : 0;
  const position = Math.min(1, ratio / 2) * 100;
  const exposure = advance - work;

  return (
    <div className="relative mt-14 grid gap-8 overflow-hidden rounded-[28px] border border-mk-border/80 bg-white/80 p-6 shadow-mk-lift backdrop-blur-xl sm:p-10 lg:grid-cols-2 lg:gap-12">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-mk-primary/10 blur-3xl"
        aria-hidden
      />
      <div>
        <h3 className="text-xl font-bold text-mk-text sm:text-2xl">{m.title}</h3>
        <p className="mt-2 text-sm text-mk-muted">{m.subtitle}</p>
        <div className="mt-6 grid gap-6">
          <Slider id="mk-advance" label={m.advanceLabel} value={advance} onChange={setAdvance} />
          <Slider id="mk-work" label={m.workLabel} value={work} onChange={setWork} />
        </div>
        <Button
          variant="ghost"
          className="mt-6 px-3"
          onClick={() => {
            setAdvance(m.initialAdvance);
            setWork(m.initialWork);
          }}
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          {m.reset}
        </Button>
      </div>

      <div className="flex flex-col justify-center rounded-2xl bg-mk-bg p-5 sm:p-6" aria-live="polite">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-mk-muted">Risk</span>
          <Badge tone={style.badge} className="text-sm">
            {m.levels[level].label}
          </Badge>
        </div>
        <div className="relative mt-6">
          <div
            className={cn('flex h-4 overflow-hidden rounded-full transition-shadow duration-500', glow[level])}
            aria-hidden
          >
            <span className="bg-mk-primary" style={{ width: `${(m.watchFrom / 2) * 100}%` }} />
            <span className="bg-mk-amber" style={{ width: `${((m.highFrom - m.watchFrom) / 2) * 100}%` }} />
            <span className="flex-1 bg-mk-red" />
          </div>
          <motion.div
            className="absolute -top-2 h-8 w-1.5 -translate-x-1/2 rounded-full bg-mk-text shadow"
            initial={false}
            animate={{ left: `${position}%` }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 16 }}
            aria-hidden
          />
          <div className="mt-3 flex justify-between text-xs font-medium text-mk-muted" aria-hidden>
            <span>{m.levels.safe.label}</span>
            <span>{m.levels.watch.label}</span>
            <span>{m.levels.high.label}</span>
          </div>
        </div>
        <p className={cn('mt-6 text-lg font-bold', style.text)}>{m.levels[level].message}</p>
        <p className="mt-1 text-sm text-mk-muted">
          {exposure > 0
            ? `Advance is ₹${formatIndian(exposure)} more than the work done.`
            : `Work done covers the advance with ₹${formatIndian(-exposure)} to spare.`}
        </p>
        <span className={cn('mt-4 h-1 w-16 rounded-full', style.bg)} aria-hidden />
      </div>
    </div>
  );
}

export function Guards() {
  return (
    <Section
      id="guards"
      className="bg-white"
      background={
        <>
          <BrickBackground />
          <MeshBlobs tones={['green', 'brick', 'teal']} />
        </>
      }
    >
      <Reveal>
        <SectionHeading eyebrow={guards.eyebrow} title={guards.title} subtitle={guards.subtitle} />
      </Reveal>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
        {guards.cards.map((card, i) => (
          <Reveal key={card.key} delay={i * 0.06} className={cn('h-full lg:col-span-2', i === 3 && 'lg:col-start-2')}>
            <GuardTile card={card} />
          </Reveal>
        ))}
      </div>
      <Reveal>
        <RiskMeter />
      </Reveal>
    </Section>
  );
}
