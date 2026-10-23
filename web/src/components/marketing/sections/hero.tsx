'use client';

import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import {
  ArrowRight,
  BadgeIndianRupee,
  CheckCircle2,
  ClipboardCheck,
  Flame,
  PackageCheck,
  PlayCircle,
  ShieldCheck,
  Smile,
  Truck,
  UserRoundCheck,
  Users,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { brandConfig, brandIcon } from '@/lib/brand';
import { hero, statsBar } from '@/lib/marketing-content';
import { Logo } from '@/components/brand/logo';
import { cn } from '@/lib/cn';
import { MeshBlobs, SmokeParticles } from '../effects/ambient';
import { BrickBackground } from '../effects/brick-background';
import { FloatingBricks } from '../effects/floating-bricks';
import { useOnScreen } from '../effects/hooks';
import { CursorSpotlight } from '../effects/spotlight';
import { WhenIdle } from '../effects/when-idle';
import { LaptopFrame, PhoneFrame } from '../mockups/devices';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { CountUp, formatIndian } from '../ui/count-up';
import { useSignedIn } from '../use-signed-in';

const trustIcons: Record<(typeof hero.trust)[number]['icon'], LucideIcon> = {
  wifiOff: WifiOff,
  gst: BadgeIndianRupee,
  shield: ShieldCheck,
  smile: Smile,
};

const tileIcons: LucideIcon[] = [Flame, Users, PackageCheck, Truck];

const alertIcons: Record<(typeof hero.liveAlerts)[number]['icon'], LucideIcon> = {
  coal: Flame,
  truck: Truck,
  sardar: UserRoundCheck,
  sorted: CheckCircle2,
};

const alertTone = {
  bad: 'bg-mk-red-soft text-mk-red',
  warn: 'bg-mk-amber-soft text-amber-800',
  good: 'bg-mk-primary-soft text-mk-primary',
} as const;

/** Where each alert card sits around the laptop (percent of the visual box). */
const alertPlaces = [
  'left-[-4%] top-[2%]',
  'right-[2%] top-[-6%]',
  'left-[-6%] bottom-[22%]',
  'right-[-2%] bottom-[2%]',
];

/** Semicircular brick arch, drawn once: 15 voussoirs and two short piers. */
const ARCH = (() => {
  const cx = 250;
  const cy = 250;
  const r1 = 190;
  const r2 = 232;
  const n = 15;
  const wedges: string[] = [];
  for (let i = 0; i < n; i++) {
    const a1 = Math.PI - (i / n) * Math.PI;
    const a2 = Math.PI - ((i + 1) / n) * Math.PI;
    const p = (r: number, a: number) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy - r * Math.sin(a)).toFixed(1)}`;
    wedges.push(
      `M${p(r1, a1)}L${p(r2, a1)}A${r2} ${r2} 0 0 1 ${p(r2, a2)}L${p(r1, a2)}A${r1} ${r1} 0 0 0 ${p(r1, a1)}Z`,
    );
  }
  return wedges;
})();

function BrickArch() {
  return (
    <svg viewBox="0 0 500 330" className="absolute left-1/2 top-[4%] w-[112%] -translate-x-1/2" aria-hidden>
      <g fill="rgb(var(--mk-surface))" fillOpacity="0.55" stroke="rgb(var(--mk-primary))" strokeOpacity="0.14">
        {ARCH.map((d, i) => (
          <path key={i} d={d} />
        ))}
        {[0, 1, 2, 3].map((row) => (
          <g key={row}>
            <rect x={18 + (row % 2) * 6} y={252 + row * 18} width={36} height={16} rx={2} />
            <rect x={446 - (row % 2) * 6} y={252 + row * 18} width={36} height={16} rx={2} />
          </g>
        ))}
      </g>
    </svg>
  );
}

function DashboardPreview() {
  const { fired, onHand, costPer1000, benchmarkPer1000 } = hero.kpis;
  const under = benchmarkPer1000 - costPer1000;
  const bars = [62, 74, 58, 81, 69, 88, 77];
  return (
    <div className="flex text-left" aria-hidden>
      <div className="hidden w-[18%] shrink-0 flex-col gap-1.5 border-r border-mk-border bg-white p-2 sm:flex">
        <div className="mb-1 flex items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- 16px decorative mark inside a mock screen */}
          <img src={brandIcon.small} alt="" width={16} height={16} className="h-4 w-4" />
          <span className="text-[9px] font-bold text-mk-text">{brandConfig.productName}</span>
        </div>
        {['Dashboard', 'Production', 'Labour', 'Sales', 'Stock', 'Accounts'].map((l, i) => (
          <div
            key={l}
            className={
              i === 0
                ? 'rounded bg-mk-primary-soft px-1.5 py-1 text-[8px] font-semibold text-mk-primary'
                : 'px-1.5 py-1 text-[8px] text-mk-muted'
            }
          >
            {l}
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1 p-2.5 sm:p-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-mk-text sm:text-xs">Good morning</div>
            <div className="text-[8px] text-mk-muted sm:text-[9px]">Kiln 1 · Season 2026–27</div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-mk-primary-soft px-2 py-0.5 text-[8px] font-semibold text-mk-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mk-primary" />
            Live
          </span>
        </div>
        {/* The cost card is wider and its benchmark line may wrap, so nothing is ever clipped. */}
        <div className="grid grid-cols-[1fr_1fr_1.35fr] gap-1.5 sm:gap-2">
          <div className="min-w-0 rounded-lg border border-mk-border bg-white p-1.5 sm:p-2">
            <div className="text-[7px] font-medium leading-tight text-mk-muted sm:text-[9px]">Bricks Fired</div>
            <CountUp value={fired} className="block text-[11px] font-bold tabular-nums text-mk-text sm:text-base" />
          </div>
          <div className="min-w-0 rounded-lg border border-mk-border bg-white p-1.5 sm:p-2">
            <div className="text-[7px] font-medium leading-tight text-mk-muted sm:text-[9px]">Bricks on Hand</div>
            <CountUp value={onHand} className="block text-[11px] font-bold tabular-nums text-mk-text sm:text-base" />
          </div>
          <div className="min-w-0 rounded-lg border border-mk-border bg-white p-1.5 sm:p-2">
            <div className="text-[7px] font-medium leading-tight text-mk-muted sm:text-[9px]">Cost per 1,000</div>
            <CountUp
              value={costPer1000}
              prefix="₹"
              className="block text-[11px] font-bold tabular-nums text-mk-primary sm:text-base"
            />
            <div className="text-[7px] leading-tight text-mk-muted sm:text-[8px]">
              vs ₹{formatIndian(benchmarkPer1000)} benchmark
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-col items-start gap-1.5 rounded-lg border border-mk-border bg-white p-2">
          <Badge className="px-1.5 text-[8px] sm:text-[10px]">₹{formatIndian(under)} under benchmark</Badge>
          <div className="flex h-10 w-full items-end gap-1 sm:h-14">
            {bars.map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-t bg-mk-primary/80"
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.4 + i * 0.07, duration: 0.6, ease: 'easeOut' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PhonePreview() {
  return (
    <div className="px-2.5 pb-3 pt-7 text-left" aria-hidden>
      <div className="mb-2 rounded-lg bg-mk-primary px-2.5 py-2 text-white">
        <div className="text-[8px] opacity-80">Kiln 1</div>
        <div className="text-[11px] font-bold">Namaste, Anil</div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {hero.phoneTiles.map((t, i) => {
          const Icon = tileIcons[i] ?? ClipboardCheck;
          return (
            <div key={t} className="flex flex-col gap-1 rounded-lg border border-mk-border bg-white p-2">
              <Icon className="h-3.5 w-3.5 text-mk-primary" />
              <span className="text-[8px] font-semibold leading-tight text-mk-text">{t}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between rounded-lg bg-mk-primary-soft px-2 py-1.5">
        <span className="text-[8px] font-medium text-mk-primary">All entries sent</span>
        <span className="h-1.5 w-1.5 rounded-full bg-mk-primary" />
      </div>
    </div>
  );
}

/** Sample alerts pop in one at a time around the laptop, then the cycle starts again. */
function LiveAlerts() {
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(ref);
  const reduce = useReducedMotion();
  const total = hero.liveAlerts.length;
  const [shown, setShown] = useState(reduce ? total : 0);

  useEffect(() => {
    if (reduce) {
      setShown(total);
      return;
    }
    if (!onScreen) return;
    // One more card every 1.8s; once all are up, hold, then clear and begin again.
    const t = setTimeout(
      () => setShown((n) => (n >= total ? 0 : n + 1)),
      shown >= total ? 4000 : shown === 0 ? 900 : 1800,
    );
    return () => clearTimeout(t);
  }, [shown, onScreen, reduce, total]);

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-10 hidden sm:block" aria-hidden>
      <AnimatePresence>
        {hero.liveAlerts.slice(0, shown).map((a, i) => {
          const Icon = alertIcons[a.icon];
          return (
            <motion.div
              key={a.text}
              className={cn('absolute', alertPlaces[i])}
              initial={{ opacity: 0, scale: 0.85, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25, delay: i * 0.05 } }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              <div
                className="mk-float flex max-w-[12.5rem] items-center gap-2 rounded-xl border border-mk-border/80 bg-white/90 px-2.5 py-2 shadow-mk-lift backdrop-blur-md"
                style={{ animationDelay: `${i * -2}s`, animationDuration: `${7 + i}s` }}
              >
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', alertTone[a.tone])}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-semibold leading-snug text-mk-text">
                  {a.text}
                  <span className="ml-1 rounded bg-slate-100 px-1 py-px text-[9px] font-medium text-mk-muted">
                    {hero.sampleLabel}
                  </span>
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function HeroVisual() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const laptopX = useTransform(sx, (v) => v * -10);
  const laptopY = useTransform(sy, (v) => v * -8);
  const phoneX = useTransform(sx, (v) => v * 18);
  const phoneY = useTransform(sy, (v) => v * 14);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => {
    mx.set(0);
    my.set(0);
  };
  const float = (amount: number, duration: number) =>
    reduce
      ? {}
      : { animate: { y: [0, -amount, 0] }, transition: { duration, repeat: Infinity, ease: 'easeInOut' as const } };

  return (
    <div
      className="relative mx-auto w-full max-w-2xl px-2 pb-16 pt-10 sm:px-6 lg:max-w-none lg:pt-32"
      onMouseMove={onMove}
      onMouseLeave={reset}
    >
      {/* Halo and arch sit behind the devices. */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[115%] w-[115%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(var(--mk-primary)/0.18),rgb(var(--mk-primary-soft)/0.5)_55%,transparent)]"
        aria-hidden
      />
      <BrickArch />
      {/* The brand, set like a sign over the arch. */}
      <div className="pointer-events-none absolute left-1/2 top-0 z-[1] hidden -translate-x-1/2 lg:block">
        <Logo variant="stacked" size="md" animated />
      </div>

      <div
        className="relative pr-[20%]"
        role="img"
        aria-label="BRICS dashboard on a laptop showing 1,75,900 bricks fired, 1,21,200 bricks on hand and cost per 1,000 of ₹2,950, next to the BRICS phone app."
      >
        <motion.div style={{ x: laptopX, y: laptopY }}>
          <motion.div {...float(6, 6)}>
            <LaptopFrame>
              <DashboardPreview />
            </LaptopFrame>
          </motion.div>
        </motion.div>
        <motion.div className="absolute -bottom-10 right-0 w-[29%] max-w-[180px]" style={{ x: phoneX, y: phoneY }}>
          <motion.div {...float(10, 5)}>
            <PhoneFrame>
              <PhonePreview />
            </PhoneFrame>
          </motion.div>
        </motion.div>
      </div>
      <LiveAlerts />
    </div>
  );
}

/** "every rupee" gets a soft amber underline that sweeps in once the headline lands. */
function AccentLine() {
  const text = hero.headlineAccent;
  const at = text.indexOf(hero.underline);
  if (at < 0) return <span className="text-mk-primary">{text}</span>;
  return (
    <span className="text-mk-primary">
      {text.slice(0, at)}
      <span className="relative inline-block whitespace-nowrap">
        <span
          className="absolute inset-x-0 bottom-[0.06em] -z-10 h-[0.32em] origin-left rounded-full bg-mk-amber/45 motion-safe:animate-[mk-sweep_0.9s_ease-out_0.7s_both]"
          aria-hidden
        />
        {hero.underline}
      </span>
      {text.slice(at + hero.underline.length)}
    </span>
  );
}

function StatsStrip() {
  return (
    <div className="relative isolate overflow-hidden border-y border-mk-border/70 bg-white/70 backdrop-blur">
      <BrickBackground intensity="medium" />
      <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 py-4 sm:px-6 md:grid-cols-4 lg:px-8">
        {statsBar.map((s) => (
          <li
            key={s.label}
            className="flex items-center justify-center gap-2 rounded-full border border-mk-border/80 bg-white/85 px-4 py-2.5 text-center shadow-mk-soft"
          >
            {s.count !== undefined ? (
              <CountUp value={s.count} className="text-lg font-extrabold tabular-nums text-mk-primary" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-mk-primary" aria-hidden />
            )}
            <span className="text-sm font-medium text-mk-text">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Hero() {
  const signedIn = useSignedIn();
  return (
    <>
      <section className="relative isolate overflow-hidden" aria-labelledby="mk-hero-title">
        <BrickBackground intensity="medium" />
        <WhenIdle>
          <CursorSpotlight />
          <MeshBlobs tones={['green', 'amber', 'green']} />
          <FloatingBricks />
          <SmokeParticles />
        </WhenIdle>

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[1fr_1.15fr] lg:gap-8 lg:px-8 lg:pb-20 lg:pt-16">
          <div>
            <Badge className="mk-enter mb-5">{hero.eyebrow}</Badge>
            <h1
              id="mk-hero-title"
              className="text-4xl font-extrabold leading-[1.1] tracking-tight text-mk-text sm:text-5xl lg:text-[3.4rem]"
            >
              {hero.headline} <AccentLine />
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-mk-muted">{hero.sub}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href={signedIn ? '/dashboard' : '/login'} size="lg">
                {signedIn ? 'Open Dashboard' : hero.primaryCta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button href="#tour" variant="outline" size="lg">
                <PlayCircle className="h-5 w-5 text-mk-primary transition-transform group-hover:scale-110" />
                {hero.secondaryCta}
              </Button>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {hero.trust.map((t, i) => {
                const Icon = trustIcons[t.icon];
                return (
                  <li
                    key={t.label}
                    style={{ animationDelay: `${0.3 + i * 0.07}s` }}
                    className="mk-enter group flex items-center gap-2.5 rounded-xl border border-mk-border/80 bg-white/75 px-3 py-2.5 backdrop-blur transition-colors hover:border-mk-primary/30 sm:flex-col sm:items-start sm:gap-2"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mk-primary-soft transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                      <Icon className="h-4 w-4 text-mk-primary" aria-hidden />
                    </span>
                    <span className="text-[13px] font-medium leading-snug text-mk-text">{t.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mk-enter" style={{ animationDelay: '0.15s' }}>
            <HeroVisual />
          </div>
        </div>
      </section>
      <StatsStrip />
    </>
  );
}
