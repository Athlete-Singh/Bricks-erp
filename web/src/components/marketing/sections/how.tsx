'use client';

import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { Factory, Smartphone, Sparkles, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { how } from '@/lib/marketing-content';
import { cn } from '@/lib/cn';
import { BrickBackground } from '../effects/brick-background';
import { MiniCard } from '../ui/mini-card';
import { KilnScene } from './kiln-scene';
import { Reveal } from '../ui/reveal';
import { Section } from '../ui/section';
import { SectionHeading } from '../ui/section-heading';

const ADVANCE_MS = 6000;
const blockIcons: LucideIcon[] = [Factory, Smartphone, Sparkles];

export function How() {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-20% 0px -20% 0px' });
  const tabsRef = useRef<HTMLDivElement>(null);
  const step = how.steps[index]!;
  const playing = auto && inView && !reduce;

  // Auto-advance only while on screen, and never again once the visitor picks a step.
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % how.steps.length), ADVANCE_MS);
    return () => clearTimeout(t);
  }, [playing, index]);

  // Keep the chosen chip in view on the phone's horizontal tab bar.
  useEffect(() => {
    const bar = tabsRef.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-step="${index}"]`);
    if (bar && chip && bar.scrollWidth > bar.clientWidth) {
      bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' });
    }
  }, [index]);

  const pick = (i: number) => {
    setAuto(false);
    setIndex(i);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (index + (e.key === 'ArrowRight' ? 1 : how.steps.length - 1)) % how.steps.length;
    pick(next);
    tabsRef.current?.querySelector<HTMLElement>(`[data-step="${next}"]`)?.focus();
  };

  const blocks = [step.kiln, step.staff, step.owner];
  const progress = how.steps.length > 1 ? index / (how.steps.length - 1) : 0;

  return (
    <Section
      id="how"
      className="bg-white"
      background={<BrickBackground variant="building" intensity="medium" progress={progress} />}
    >
      <Reveal>
        <SectionHeading eyebrow={how.eyebrow} title={how.title} subtitle={how.subtitle} />
      </Reveal>

      <div ref={ref} className="mt-12">
        <div className="relative">
          {/* Progress line behind the step dots (wide screens). */}
          <div
            className="absolute left-[8.33%] right-[8.33%] top-6 hidden h-1 rounded-full bg-mk-border md:block"
            aria-hidden
          >
            <motion.div
              className="h-full rounded-full bg-mk-primary"
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: reduce ? 0 : 0.5, ease: 'easeInOut' }}
            />
          </div>

          <div
            ref={tabsRef}
            role="tablist"
            aria-label="Steps from soil to sale"
            onKeyDown={onKey}
            className="mk-no-scrollbar relative -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-6 md:gap-0 md:overflow-visible md:px-0"
          >
            {how.steps.map((s, i) => {
              const selected = i === index;
              const done = i < index;
              return (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  id={`how-tab-${s.key}`}
                  aria-selected={selected}
                  aria-controls="how-panel"
                  tabIndex={selected ? 0 : -1}
                  data-step={i}
                  onClick={() => pick(i)}
                  className={cn(
                    'group flex shrink-0 snap-center items-center gap-2 rounded-full border px-4 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary md:flex-col md:gap-3 md:rounded-2xl md:border-0 md:px-2 md:py-0 md:text-center',
                    selected
                      ? 'border-mk-primary bg-mk-primary-soft md:bg-transparent'
                      : 'border-mk-border bg-white md:bg-transparent',
                  )}
                >
                  <span
                    className={cn(
                      'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors md:h-12 md:w-12 md:text-base',
                      selected || done
                        ? 'bg-mk-primary text-white'
                        : 'bg-mk-bg text-mk-muted ring-1 ring-mk-border md:bg-white',
                      selected && 'md:ring-4 md:ring-mk-primary-soft',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span>
                    <span
                      className={cn(
                        'block whitespace-nowrap text-sm font-semibold',
                        selected ? 'text-mk-primary' : 'text-mk-text',
                      )}
                    >
                      {s.label}
                    </span>
                    <span className="hidden text-xs text-mk-muted md:block">{s.short}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {playing && (
            <div className="mx-auto mt-4 h-1 max-w-[12rem] overflow-hidden rounded-full bg-mk-border" aria-hidden>
              <motion.div
                key={index}
                className="h-full bg-mk-primary/60"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: ADVANCE_MS / 1000, ease: 'linear' }}
              />
            </div>
          )}
          <KilnScene active={index} />
        </div>

        <div
          id="how-panel"
          role="tabpanel"
          aria-labelledby={`how-tab-${step.key}`}
          className="mt-8 rounded-[24px] border border-mk-border/80 bg-mk-bg/80 p-5 shadow-mk-soft backdrop-blur-md sm:p-8"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step.key}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="grid items-center gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-10"
            >
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {blocks.map((text, i) => {
                  const Icon = blockIcons[i]!;
                  return (
                    <div key={how.blocks[i]} className="flex gap-4 rounded-2xl bg-white p-4 shadow-mk-soft">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mk-primary-soft">
                        <Icon className="h-5 w-5 text-mk-primary" aria-hidden />
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-mk-muted">{how.blocks[i]}</p>
                        <p className="mt-1 text-sm font-medium leading-relaxed text-mk-text sm:text-base">{text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <MiniCard card={step.card} className="mx-auto w-full max-w-sm" />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Section>
  );
}
