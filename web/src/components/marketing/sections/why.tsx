'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Flame, HandCoins, NotebookPen, Truck, type LucideIcon } from 'lucide-react';
import { useRef, useState, type ComponentType } from 'react';
import { why } from '@/lib/marketing-content';
import { cn } from '@/lib/cn';
import { BrickBackground } from '../effects/brick-background';
import { useMotionOk, useOnScreen } from '../effects/hooks';
import { CountUp } from '../ui/count-up';
import { Reveal } from '../ui/reveal';
import { Section } from '../ui/section';
import { SectionHeading } from '../ui/section-heading';
import { AdvanceBars, CoalGauge, DiaryPage, GateNoBill } from './why-illustrations';

type Pain = (typeof why.pains)[number];

const icons: Record<Pain['icon'], LucideIcon> = {
  advance: HandCoins,
  coal: Flame,
  truck: Truck,
  diary: NotebookPen,
};

const pictures: Record<Pain['icon'], ComponentType<{ play: boolean }>> = {
  advance: AdvanceBars,
  coal: CoalGauge,
  truck: GateNoBill,
  diary: DiaryPage,
};

function PainCard({ pain, play }: { pain: Pain; play: boolean }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const fixed = hover || pinned;
  const Icon = icons[pain.icon];
  const Picture = pictures[pain.icon];
  return (
    <button
      type="button"
      aria-pressed={pinned}
      onClick={() => setPinned((p) => !p)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-mk border border-mk-border/80 bg-white/85 p-5 text-left shadow-mk-soft backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:shadow-mk-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className="mk-ring" aria-hidden />
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-mk-brick to-mk-amber" aria-hidden />
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mk-brick-soft">
          <Icon className="h-5 w-5 text-mk-brick" aria-hidden />
        </span>
        <h3 className="text-lg font-bold leading-tight text-mk-text">{pain.title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-mk-muted">{pain.pain}</p>

      <div className="relative mt-4 flex min-h-[8.5rem] flex-1 items-center justify-center rounded-xl border border-mk-border/70 bg-white p-3">
        <AnimatePresence mode="wait" initial={false}>
          {fixed ? (
            <motion.div
              key="fix"
              initial={{ opacity: 0, rotateX: -70 }}
              animate={{ opacity: 1, rotateX: 0 }}
              exit={{ opacity: 0, rotateX: 70 }}
              transition={{ duration: 0.28 }}
              className="w-full self-stretch rounded-lg bg-mk-primary-soft p-3"
            >
              <p className="flex items-center gap-1.5 text-sm font-bold text-mk-primary">
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.12, type: 'spring' }}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                </motion.span>
                {why.fixLabel}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-mk-text">{pain.fix}</p>
            </motion.div>
          ) : (
            <motion.div
              key="pain"
              initial={{ opacity: 0, rotateX: 70 }}
              animate={{ opacity: 1, rotateX: 0 }}
              exit={{ opacity: 0, rotateX: -70 }}
              transition={{ duration: 0.28 }}
              className="flex w-full justify-center"
            >
              <Picture play={play} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <span className={cn('mt-3 text-xs font-semibold transition-colors', fixed ? 'text-mk-primary' : 'text-mk-muted')}>
        {fixed ? '✓ ' : ''}
        {why.fixLabel} →
      </span>
    </button>
  );
}

/** A 0–10% scale with the 5–8% band filling in. */
function LossMeter({ play }: { play: boolean }) {
  const { from, to } = why.loss;
  return (
    <div className="w-full max-w-sm" aria-hidden>
      <div className="relative h-4 overflow-hidden rounded-full bg-white/80 ring-1 ring-mk-brick/20">
        <motion.span
          className="absolute inset-y-0 rounded-full bg-gradient-to-r from-mk-amber to-mk-brick"
          style={{ left: `${from * 10}%`, width: `${(to - from) * 10}%`, originX: 0 }}
          initial={{ scaleX: 0 }}
          animate={play ? { scaleX: 1 } : {}}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
        />
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="absolute inset-y-0 w-px bg-mk-brick/15" style={{ left: `${(i + 1) * 10}%` }} />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-medium text-mk-muted">
        <span>0%</span>
        <span>5%</span>
        <span>10%</span>
      </div>
    </div>
  );
}

export function Why() {
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(ref);
  const motionOk = useMotionOk();
  const play = onScreen && motionOk;

  return (
    <Section id="why" background={<BrickBackground variant="cracked" intensity="medium" />}>
      <Reveal>
        <SectionHeading eyebrow={why.eyebrow} title={why.title} subtitle={why.subtitle} />
      </Reveal>

      <div ref={ref} className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" style={{ perspective: 900 }}>
        {why.pains.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.06} className="h-full">
            <PainCard pain={p} play={play} />
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <div className="relative mt-12 overflow-hidden rounded-[24px] border border-mk-brick/25 bg-gradient-to-r from-mk-brick-soft via-white to-mk-amber-soft p-6 shadow-mk-soft sm:p-8">
          <div className="grid items-center gap-6 md:grid-cols-[auto_1fr_minmax(12rem,18rem)]">
            <p className="text-5xl font-black tracking-tight text-mk-brick sm:text-6xl">
              <CountUp value={why.loss.from} />–<CountUp value={why.loss.to} />%
            </p>
            <p className="text-lg font-semibold leading-snug text-mk-text sm:text-xl">
              {why.loss.lead} {why.loss.from}–{why.loss.to}% {why.loss.tail}
            </p>
            <LossMeter play={onScreen} />
          </div>
        </div>
        <p className="mt-3 text-center text-xs font-medium text-mk-muted">{why.loss.note}</p>
      </Reveal>
    </Section>
  );
}
