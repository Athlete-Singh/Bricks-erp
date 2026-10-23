'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  BadgeIndianRupee,
  BarChart2,
  BookOpen,
  Boxes,
  ChevronsLeftRight,
  Flame,
  Receipt,
  ScrollText,
  ShoppingCart,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { beforeAfter, liveFeed, marquee, testimonials } from '@/lib/marketing-content';
import { cn } from '@/lib/cn';
import { BrickBackground } from '../effects/brick-background';
import { useOnScreen } from '../effects/hooks';
import { mk, wallTile } from '../effects/patterns';
import { Reveal } from '../ui/reveal';
import { Section } from '../ui/section';
import { SectionHeading } from '../ui/section-heading';

const moduleIcons: Record<string, LucideIcon> = {
  production: Flame,
  labour: Users,
  purchases: ShoppingCart,
  sales: Receipt,
  dispatch: Truck,
  stock: Boxes,
  accounts: BookOpen,
  gst: BadgeIndianRupee,
  audit: ScrollText,
  reports: BarChart2,
};

/** Module names gliding past on a brick band. Pauses on hover and keyboard focus. */
export function ModuleMarquee() {
  const items = [...marquee.modules, ...marquee.modules];
  return (
    <section
      aria-label={marquee.label}
      className="mk-marquee-host relative isolate overflow-hidden border-y border-mk-border/70 bg-white/80 py-4"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ backgroundImage: wallTile(mk.primary, 0.06) }}
        aria-hidden
      />
      <div
        className="flex w-max"
        style={{
          maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
        }}
      >
        <ul className="mk-marquee flex shrink-0 gap-3 pr-3">
          {items.map((m, i) => {
            const Icon = moduleIcons[m.icon] ?? Boxes;
            return (
              <li
                key={`${m.label}-${i}`}
                aria-hidden={i >= marquee.modules.length}
                className="flex items-center gap-2 whitespace-nowrap rounded-full border border-mk-border/80 bg-white px-4 py-2 text-sm font-semibold text-mk-text shadow-mk-soft"
              >
                <Icon className="h-4 w-4 text-mk-primary" aria-hidden />
                {m.label}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** "Today at the kiln": sample events arrive at the top one by one. Clearly marked as demo data. */
export function LiveFeed() {
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(ref);
  const reduce = useReducedMotion();
  const n = liveFeed.events.length;
  const [head, setHead] = useState(0);

  useEffect(() => {
    if (!onScreen || reduce) return;
    const t = setInterval(() => setHead((h) => (h + 1) % n), 2600);
    return () => clearInterval(t);
  }, [onScreen, reduce, n]);

  // Newest first: the four most recent events counted back from `head`.
  const visible = Array.from({ length: 4 }, (_, k) => {
    const i = (head - k + n) % n;
    return { ...liveFeed.events[i]!, i };
  });

  return (
    <Section aria-label={liveFeed.eyebrow} background={<BrickBackground intensity="medium" />}>
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <SectionHeading align="left" eyebrow={liveFeed.eyebrow} title={liveFeed.title} subtitle={liveFeed.subtitle} />
        </Reveal>
        <Reveal delay={0.1}>
          <div
            ref={ref}
            className="rounded-[24px] border border-mk-border/80 bg-white/85 p-5 shadow-mk-lift backdrop-blur-md sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold text-mk-text">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mk-primary opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mk-primary" />
                </span>
                Kiln 1 · Live
              </p>
              <span className="rounded-full bg-mk-amber-soft px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                {liveFeed.demoLabel}
              </span>
            </div>
            <ul className="grid gap-2" aria-live="off">
              <AnimatePresence initial={false}>
                {visible.map((e, k) => {
                  const Icon = moduleIcons[e.icon] ?? Boxes;
                  return (
                    <motion.li
                      key={e.i}
                      layout
                      initial={{ opacity: 0, y: -14, scale: 0.98 }}
                      animate={{ opacity: k === 3 ? 0.5 : 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-3 py-2.5',
                        k === 0 ? 'border-mk-primary/30 bg-mk-primary-soft/60' : 'border-mk-border/70 bg-white',
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                        <Icon className="h-4 w-4 text-mk-primary" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-medium text-mk-text">{e.text}</span>
                      <span className="shrink-0 text-xs tabular-nums text-mk-muted">{e.time}</span>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function DiarySide() {
  return (
    <div className="absolute inset-0 bg-[#FFF8E6] p-5 sm:p-8">
      <div className="absolute inset-y-0 left-10 w-px bg-mk-brick/30 sm:left-14" aria-hidden />
      <div
        className="absolute inset-0 opacity-70"
        style={{ backgroundImage: 'repeating-linear-gradient(transparent 0 31px, rgb(56 189 248 / 0.25) 31px 32px)' }}
        aria-hidden
      />
      <ul className="relative ml-8 grid gap-[10px] pt-1 font-[cursive] text-[15px] italic leading-[22px] text-slate-600 sm:ml-12 sm:text-base">
        {beforeAfter.diaryLines.map((l, i) => (
          <li key={l} style={{ transform: `rotate(${i % 2 ? 0.6 : -0.8}deg)` }}>
            {l}
          </li>
        ))}
      </ul>
      <span className="absolute bottom-6 right-[55%] rotate-[-8deg] rounded border-2 border-mk-red/60 px-2 py-0.5 text-sm font-bold uppercase text-mk-red/70">
        Total ???
      </span>
      <span className="absolute left-4 top-4 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-mk-brick shadow-sm">
        {beforeAfter.before}
      </span>
    </div>
  );
}

function DashboardSide() {
  const kpis = [
    { label: 'Bricks fired', value: '1,75,900' },
    { label: 'On hand', value: '1,21,200' },
    { label: 'Cost / 1,000', value: '₹2,950' },
    { label: 'Receivable', value: '₹6,85,000' },
  ];
  return (
    <div className="absolute inset-0 bg-mk-bg p-5 sm:p-8">
      <span className="absolute right-4 top-4 rounded-full bg-mk-primary px-3 py-1 text-xs font-semibold text-white shadow-sm">
        {beforeAfter.after}
      </span>
      <div className="ml-auto mt-10 grid max-w-md grid-cols-2 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-mk-border bg-white p-3 shadow-sm">
            <p className="text-xs text-mk-muted">{k.label}</p>
            <p className="text-lg font-bold tabular-nums text-mk-text">{k.value}</p>
          </div>
        ))}
        <div className="col-span-2 flex h-16 items-end gap-1.5 rounded-xl border border-mk-border bg-white p-3">
          {[50, 64, 58, 72, 66, 84, 78, 90].map((h, i) => (
            <span key={i} className="flex-1 rounded-t bg-mk-primary/80" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Drag (or use arrow keys) to wipe between the diary and the dashboard. */
export function BeforeAfter() {
  const [pos, setPos] = useState(50);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const fromPointer = (e: PointerEvent) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(95, Math.max(5, ((e.clientX - r.left) / r.width) * 100)));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setPos((p) => Math.max(5, p - 5));
    if (e.key === 'ArrowRight') setPos((p) => Math.min(95, p + 5));
  };

  return (
    <Section aria-label={beforeAfter.title} className="bg-white" background={<BrickBackground variant="cracked" />}>
      <Reveal>
        <SectionHeading eyebrow={beforeAfter.eyebrow} title={beforeAfter.title} subtitle={beforeAfter.subtitle} />
      </Reveal>
      <Reveal delay={0.1}>
        <div
          ref={boxRef}
          className="relative mx-auto mt-10 h-[22rem] max-w-5xl touch-pan-y select-none overflow-hidden rounded-[24px] border border-mk-border shadow-mk-device sm:h-[24rem]"
          onPointerDown={(e) => {
            dragging.current = true;
            (e.target as Element).setPointerCapture?.(e.pointerId);
            fromPointer(e);
          }}
          onPointerMove={(e) => dragging.current && fromPointer(e)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          <DashboardSide />
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
            <DiarySide />
          </div>
          <div
            className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.08)]"
            style={{ left: `${pos}%` }}
          >
            <button
              type="button"
              role="slider"
              aria-label={beforeAfter.handle}
              aria-valuemin={5}
              aria-valuemax={95}
              aria-valuenow={Math.round(pos)}
              onKeyDown={onKey}
              className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border-2 border-white bg-mk-primary text-white shadow-mk-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mk-primary/40"
            >
              <ChevronsLeftRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/** Hidden until real, approved quotes are added in marketing-content.ts. */
export function Testimonials() {
  if (!testimonials.show || testimonials.items.length === 0) return null;
  return (
    <Section aria-label={testimonials.title} background={<BrickBackground />}>
      <SectionHeading eyebrow={testimonials.eyebrow} title={testimonials.title} />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {testimonials.items.map((t) => (
          <figure
            key={t.name}
            className="rounded-mk border border-mk-border/80 bg-white/85 p-6 shadow-mk-soft backdrop-blur-md"
          >
            <blockquote className="text-base leading-relaxed text-mk-text">“{t.quote}”</blockquote>
            <figcaption className="mt-4 text-sm">
              <span className="font-semibold text-mk-text">{t.name}</span>
              <span className="block text-mk-muted">
                {t.kiln}, {t.place}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
