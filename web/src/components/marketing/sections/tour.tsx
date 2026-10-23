'use client';

import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  BarChart2,
  BookOpen,
  Boxes,
  Flame,
  LayoutDashboard,
  Lightbulb,
  Receipt,
  ScrollText,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { brand, tour } from '@/lib/marketing-content';
import { cn } from '@/lib/cn';
import { MeshBlobs } from '../effects/ambient';
import { BrickBackground } from '../effects/brick-background';
import { Logo } from '@/components/brand/logo';
import { BrowserFrame } from '../mockups/devices';
import { TourScreen } from '../mockups/tour-screens';
import { Reveal } from '../ui/reveal';
import { Section } from '../ui/section';
import { SectionHeading } from '../ui/section-heading';

const CYCLE_MS = 5000;

/** Same icons as the owner panel's sidebar. */
const icons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  production: Flame,
  labour: Users,
  purchases: ShoppingCart,
  sales: Receipt,
  dispatch: Truck,
  stock: Boxes,
  accounts: BookOpen,
  reports: BarChart2,
  audit: ScrollText,
  settings: Settings,
};

export function Tour() {
  const [index, setIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-15% 0px -15% 0px' });
  const current = tour.modules[index]!;
  // A short shimmer while a screen "loads", like the real app between pages.
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (reduce) return;
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 380);
    return () => clearTimeout(t);
  }, [index, reduce]);
  // The frame leans back a little and straightens as it scrolls into view.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const tilt = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [10, 0]);
  const lift = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.96, 1]);
  const running = autoplay && inView;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % tour.modules.length), CYCLE_MS);
    return () => clearTimeout(t);
  }, [running, index]);

  // On a phone the module list is a chip bar; keep the current chip in view.
  useEffect(() => {
    const bar = listRef.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-module="${index}"]`);
    if (bar && chip && bar.scrollWidth > bar.clientWidth) {
      bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' });
    }
  }, [index]);

  const pick = (i: number) => {
    setIndex(i);
    setAutoplay(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const forward = e.key === 'ArrowDown' || e.key === 'ArrowRight';
    const next = (index + (forward ? 1 : tour.modules.length - 1)) % tour.modules.length;
    pick(next);
    listRef.current?.querySelector<HTMLElement>(`[data-module="${next}"]`)?.focus();
  };

  return (
    <Section
      id="tour"
      background={
        <>
          <BrickBackground variant="blueprint" />
          <MeshBlobs tones={['green', 'teal']} />
        </>
      }
    >
      <Reveal>
        <SectionHeading eyebrow={tour.eyebrow} title={tour.title} subtitle={tour.subtitle} />
      </Reveal>

      <div className="mt-8 flex justify-center">
        <label className="inline-flex cursor-pointer items-center gap-3 rounded-full border border-mk-border bg-white px-4 py-2 text-sm font-medium text-mk-text shadow-mk-soft">
          <span>{tour.autoplay}</span>
          <span className="relative">
            <input
              type="checkbox"
              role="switch"
              className="peer sr-only"
              checked={autoplay}
              onChange={(e) => setAutoplay(e.target.checked)}
            />
            <span className="block h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-mk-primary peer-focus-visible:ring-2 peer-focus-visible:ring-mk-primary peer-focus-visible:ring-offset-2" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
      </div>

      <Reveal delay={0.1}>
        <div ref={ref} className="relative mt-8" style={{ perspective: 1400 }}>
          <div
            className="pointer-events-none absolute -inset-6 -z-10 rounded-[40px] bg-[radial-gradient(closest-side,rgb(var(--mk-primary)/0.16),transparent)] blur-2xl"
            aria-hidden
          />
          {tour.callouts.map((c, i) => (
            <motion.div
              key={c.text}
              aria-hidden
              className={cn(
                'pointer-events-none absolute z-20 hidden items-center gap-1.5 2xl:flex',
                c.side === 'left' ? '-left-44 flex-row' : '-right-44 flex-row-reverse',
              )}
              style={{ top: c.top }}
              initial={{ opacity: 0, x: c.side === 'left' ? -12 : 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.12 }}
            >
              <span
                className="mk-float whitespace-nowrap rounded-full border border-mk-border bg-white/90 px-3 py-1.5 text-xs font-semibold text-mk-text shadow-mk-soft backdrop-blur"
                style={{ animationDelay: `${-i * 2}s` }}
              >
                {c.text}
              </span>
              <svg width="40" height="12" viewBox="0 0 40 12" className={c.side === 'right' ? 'rotate-180' : ''}>
                <path d="M0 6h34" stroke="rgb(var(--mk-primary))" strokeWidth="1.5" strokeDasharray="3 3" />
                <path d="m32 2 5 4-5 4" fill="none" stroke="rgb(var(--mk-primary))" strokeWidth="1.5" />
              </svg>
            </motion.div>
          ))}
          <motion.div style={{ rotateX: tilt, scale: lift, transformOrigin: 'center top' }}>
            <BrowserFrame url={`${brand.appHost}/${current.key === 'dashboard' ? 'dashboard' : current.key}`}>
              <div className="h-1 bg-mk-border/60">
                {running && (
                  <motion.div
                    key={index}
                    className="h-full bg-mk-primary"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: CYCLE_MS / 1000, ease: 'linear' }}
                  />
                )}
              </div>
              <div className="flex flex-col md:flex-row">
                <div
                  ref={listRef}
                  role="tablist"
                  aria-label="BRICS modules"
                  onKeyDown={onKey}
                  className="mk-no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto border-b border-mk-border bg-white p-3 md:w-56 md:flex-col md:gap-0.5 md:overflow-visible md:border-b-0 md:border-r"
                >
                  <div className="mb-3 hidden items-center gap-2 px-2 md:flex">
                    <Logo variant="horizontal" size="xs" name="product" />
                  </div>
                  {tour.modules.map((m, i) => {
                    const Icon = icons[m.key] ?? LayoutDashboard;
                    const selected = i === index;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        role="tab"
                        id={`tour-tab-${m.key}`}
                        aria-selected={selected}
                        aria-controls="tour-panel"
                        tabIndex={selected ? 0 : -1}
                        data-module={i}
                        onClick={() => pick(i)}
                        className={cn(
                          'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary md:rounded-lg md:border-0 md:py-2',
                          selected
                            ? 'border-mk-primary bg-mk-primary-soft text-mk-primary'
                            : 'border-mk-border text-mk-muted hover:bg-mk-bg hover:text-mk-text',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                <div
                  id="tour-panel"
                  role="tabpanel"
                  aria-labelledby={`tour-tab-${current.key}`}
                  className="min-h-[26rem] min-w-0 flex-1 bg-mk-bg p-4 sm:p-6"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={current.key}
                      initial={reduce ? false : { opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduce ? undefined : { opacity: 0, x: -16 }}
                      transition={{ duration: 0.28, ease: 'easeOut' }}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-mk-text">{current.title}</h3>
                        <span className="hidden rounded-lg bg-mk-primary px-3 py-1.5 text-xs font-semibold text-white sm:inline">
                          + New
                        </span>
                      </div>
                      {loading ? (
                        <div className="grid gap-3" aria-hidden>
                          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                            {[0, 1, 2, 3].map((i) => (
                              <div key={i} className="mk-skeleton h-20 rounded-xl bg-slate-200/70" />
                            ))}
                          </div>
                          <div className="mk-skeleton h-40 rounded-xl bg-slate-200/70" />
                        </div>
                      ) : (
                        <TourScreen module={current} />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </BrowserFrame>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.p
              key={current.key}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mx-auto mt-5 flex max-w-3xl items-start justify-center gap-2 text-center text-base text-mk-text"
              aria-live="polite"
            >
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-mk-amber" aria-hidden />
              <span>
                <span className="font-semibold text-mk-primary">{tour.whyLabel}: </span>
                {current.why}
              </span>
            </motion.p>
          </AnimatePresence>
        </div>
      </Reveal>
    </Section>
  );
}
