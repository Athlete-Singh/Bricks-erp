'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  Cloud,
  CloudOff,
  Flame,
  Hand,
  HardHat,
  Loader2,
  PackageCheck,
  RefreshCw,
  Truck,
  Users,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { appLinks, mobile } from '@/lib/marketing-content';
import { cn } from '@/lib/cn';
import { MeshBlobs } from '../effects/ambient';
import { BrickBackground } from '../effects/brick-background';
import { mk, wallTile } from '../effects/patterns';
import { PhoneFrame } from '../mockups/devices';
import { Badge } from '../ui/badge';
import { Reveal } from '../ui/reveal';
import { Section } from '../ui/section';
import { SectionHeading } from '../ui/section-heading';

const tabIcons: LucideIcon[] = [Flame, Users, PackageCheck, Truck];
const featureIcons: LucideIcon[] = [WifiOff, RefreshCw, Hand, HardHat];

interface Entry {
  id: number;
  title: string;
  state: 'waiting' | 'sending' | 'sent';
}

function ProductionTab() {
  const [done, setDone] = useState(() => mobile.batch.stages.map((s) => s.done));
  const reduce = useReducedMotion();
  const next = done.findIndex((d, i) => !d && !mobile.batch.stages[i]!.optional);
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-mk-muted">{mobile.batch.name}</p>
      <ol className="mt-2 grid gap-2">
        {mobile.batch.stages.map((s, i) => {
          const isDone = done[i]!;
          return (
            <li key={s.key} className="flex items-center gap-2.5 rounded-xl border border-mk-border bg-white p-2.5">
              <motion.span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  isDone ? 'bg-mk-primary text-white' : 'bg-mk-bg text-mk-muted ring-1 ring-mk-border',
                )}
                animate={isDone && !reduce ? { scale: [1, 1.25, 1] } : {}}
                transition={{ duration: 0.35 }}
              >
                {isDone ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-mk-text">
                  {s.label}
                  {'optional' in s && s.optional && (
                    <span className="font-normal text-mk-muted"> ({mobile.batch.optional})</span>
                  )}
                </p>
                {isDone && <p className="text-[11px] text-mk-primary">{s.doneNote}</p>}
              </div>
              {isDone ? (
                <span className="text-[11px] font-medium text-mk-muted">{mobile.batch.recorded}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setDone((d) => d.map((v, j) => (j === i ? true : v)))}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary',
                    i === next ? 'bg-mk-primary text-white' : 'border border-mk-border text-mk-text',
                  )}
                >
                  {mobile.batch.record}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SimpleTab({ index }: { index: number }) {
  if (index === 1) {
    const tone = { Present: 'green', 'Half Day': 'amber', Absent: 'red' } as const;
    return (
      <ul className="grid gap-2">
        {mobile.attendance.map((p) => (
          <li
            key={p.name}
            className="flex items-center justify-between rounded-xl border border-mk-border bg-white px-3 py-2.5"
          >
            <span className="text-xs font-semibold text-mk-text">{p.name}</span>
            <Badge tone={tone[p.status as keyof typeof tone]} className="text-[10px]">
              {p.status}
            </Badge>
          </li>
        ))}
      </ul>
    );
  }
  const rows =
    index === 2
      ? [
          ['Supplier', mobile.receipt.supplier],
          ['Material', mobile.receipt.item],
          ['Quantity', mobile.receipt.quantity],
          ['Store', mobile.receipt.store],
        ]
      : [
          ['Challan', mobile.dispatch.challan],
          ['Vehicle', mobile.dispatch.vehicle],
          ['Bricks', mobile.dispatch.bricks],
          ['Gate', mobile.dispatch.gate],
        ];
  return (
    <dl className="divide-y divide-mk-border rounded-xl border border-mk-border bg-white px-3">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2 py-2.5 text-xs">
          <dt className="text-mk-muted">{k}</dt>
          <dd className="truncate text-right font-semibold text-mk-text">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function OfflineDemo({ online, setOnline }: { online: boolean; setOnline: (v: boolean) => void }) {
  const o = mobile.offline;
  const [entries, setEntries] = useState<Entry[]>([]);
  const nextId = useRef(0);

  // Back online: waiting entries go one after another.
  useEffect(() => {
    if (!online) return;
    const waiting = entries.find((e) => e.state === 'waiting');
    const sending = entries.find((e) => e.state === 'sending');
    if (sending) {
      const t = setTimeout(
        () => setEntries((es) => es.map((e) => (e.id === sending.id ? { ...e, state: 'sent' } : e))),
        700,
      );
      return () => clearTimeout(t);
    }
    if (waiting) {
      const t = setTimeout(
        () => setEntries((es) => es.map((e) => (e.id === waiting.id ? { ...e, state: 'sending' } : e))),
        250,
      );
      return () => clearTimeout(t);
    }
  }, [online, entries]);

  const add = () => {
    const id = nextId.current++;
    const title = o.sampleEntries[id % o.sampleEntries.length]!;
    setEntries((es) => [{ id, title, state: 'waiting' as const }, ...es].slice(0, 4));
  };

  const count = (s: Entry['state']) => entries.filter((e) => e.state === s).length;
  const counters = [
    { label: o.waiting, value: count('waiting') + count('sending'), className: 'text-amber-800 bg-mk-amber-soft' },
    { label: o.sent, value: count('sent'), className: 'text-mk-primary bg-mk-primary-soft' },
    { label: o.attention, value: 0, className: 'text-mk-red bg-mk-red-soft' },
  ];

  return (
    <div className="rounded-[24px] border border-mk-border bg-white p-5 shadow-mk-soft sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-semibold text-mk-text">
          {o.label}
          <span className="relative">
            <input
              type="checkbox"
              role="switch"
              className="peer sr-only"
              checked={online}
              onChange={(e) => setOnline(e.target.checked)}
            />
            <span className="block h-7 w-14 rounded-full bg-mk-red transition-colors peer-checked:bg-mk-primary peer-focus-visible:ring-2 peer-focus-visible:ring-mk-primary peer-focus-visible:ring-offset-2" />
            <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-7" />
          </span>
          <span className={online ? 'text-mk-primary' : 'text-mk-red'}>{online ? o.on : o.off}</span>
        </label>
        <button
          type="button"
          onClick={add}
          className="rounded-xl bg-mk-primary px-4 py-2 text-sm font-semibold text-white hover:bg-mk-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary focus-visible:ring-offset-2"
        >
          + {o.add}
        </button>
      </div>
      <p className="mt-3 text-xs text-mk-muted">{o.hint}</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {counters.map((c) => (
          <div key={c.label} className={cn('rounded-xl px-2 py-2 text-center', c.className)}>
            <p className="text-xl font-bold tabular-nums">{c.value}</p>
            <p className="text-[11px] font-medium leading-tight">{c.label}</p>
          </div>
        ))}
      </div>

      <ul className="mt-4 grid min-h-[3rem] gap-2" aria-live="polite">
        <AnimatePresence initial={false}>
          {entries.map((e) => (
            <motion.li
              key={e.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between gap-2 rounded-xl border border-mk-border px-3 py-2 text-sm"
            >
              <span className="truncate text-mk-text">{e.title}</span>
              {e.state === 'sent' ? (
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-mk-primary">
                  <Cloud className="h-4 w-4" aria-hidden /> {o.sent}
                </span>
              ) : e.state === 'sending' ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-mk-primary" aria-label="Sending" />
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-800">
                  <CloudOff className="h-4 w-4" aria-hidden /> {o.waiting}
                </span>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function StoreButton({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 rounded-xl bg-mk-text px-4 py-2.5 text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary focus-visible:ring-offset-2"
    >
      <span className="text-left leading-tight">
        <span className="block text-[10px] uppercase tracking-wide opacity-80">{sub}</span>
        <span className="block text-sm font-semibold">{label}</span>
      </span>
    </a>
  );
}

export function MobileApp() {
  const [tab, setTab] = useState(0);
  const [online, setOnline] = useState(true);

  return (
    <Section
      id="mobile"
      background={
        <>
          <BrickBackground />
          <MeshBlobs tones={['green', 'amber']} />
        </>
      }
    >
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal className="order-2 lg:order-1">
          <div className="relative mx-auto max-w-[460px] px-6 pb-16 pt-6">
            {/* Stage: a spotlight from above and a brick floor with the phone's reflection. */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-[85%] bg-[radial-gradient(ellipse_at_50%_20%,rgb(var(--mk-primary)/0.18),transparent_65%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-2 h-24"
              style={{
                backgroundImage: wallTile(mk.primary, 0.16),
                transform: 'perspective(320px) rotateX(58deg)',
                transformOrigin: 'bottom',
                maskImage: 'radial-gradient(ellipse 50% 70% at 50% 60%, #000 30%, transparent 75%)',
                WebkitMaskImage: 'radial-gradient(ellipse 50% 70% at 50% 60%, #000 30%, transparent 75%)',
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute bottom-10 left-1/2 h-6 w-56 -translate-x-1/2 rounded-full bg-mk-primary/25 blur-xl"
              aria-hidden
            />
            {mobile.orbit.map((label, i) => (
              <span
                key={label}
                aria-hidden
                className={cn(
                  'mk-float absolute z-10 hidden items-center gap-1.5 rounded-full border border-mk-border/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-mk-text shadow-mk-lift backdrop-blur sm:flex',
                  ['left-0 top-[18%]', 'right-0 top-[38%]', 'left-2 top-[66%]'][i],
                )}
                style={{ animationDelay: `${i * -3}s`, animationDuration: `${8 + i * 1.5}s` }}
              >
                <Check className="h-3.5 w-3.5 text-mk-primary" />
                {label}
              </span>
            ))}
            <PhoneFrame className="relative mx-auto w-full max-w-[300px]">
              <div className="pt-8">
                <div className="flex items-center justify-between bg-mk-primary px-4 py-3 text-white">
                  <span className="text-sm font-bold">{mobile.tabs[tab]}</span>
                  {online ? (
                    <Cloud className="h-4 w-4" aria-label="Online" />
                  ) : (
                    <CloudOff className="h-4 w-4" aria-label="Offline" />
                  )}
                </div>
                {!online && (
                  <p className="flex items-center gap-1.5 bg-mk-amber-soft px-4 py-1.5 text-[11px] font-medium text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> No internet — entries will wait on the phone
                  </p>
                )}
                <div className="h-[19rem] overflow-y-auto p-3">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tab}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {tab === 0 ? <ProductionTab /> : <SimpleTab index={tab} />}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div
                  role="tablist"
                  aria-label="App screens"
                  className="grid grid-cols-4 border-t border-mk-border bg-white"
                >
                  {mobile.tabs.map((t, i) => {
                    const Icon = tabIcons[i]!;
                    return (
                      <button
                        key={t}
                        type="button"
                        role="tab"
                        aria-selected={tab === i}
                        onClick={() => setTab(i)}
                        className={cn(
                          'flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mk-primary',
                          tab === i ? 'text-mk-primary' : 'text-mk-muted',
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </PhoneFrame>
          </div>
        </Reveal>

        <div className="order-1 lg:order-2">
          <Reveal>
            <SectionHeading align="left" eyebrow={mobile.eyebrow} title={mobile.title} subtitle={mobile.subtitle} />
          </Reveal>
          <Reveal delay={0.05}>
            <ul className="mt-6 grid grid-cols-2 gap-3">
              {mobile.features.map((f, i) => {
                const Icon = featureIcons[i]!;
                return (
                  <li
                    key={f}
                    className="flex items-center gap-2 rounded-xl border border-mk-border bg-white px-3 py-2.5 text-sm font-medium text-mk-text"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-mk-primary" aria-hidden />
                    {f}
                  </li>
                );
              })}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="mt-6">
            <OfflineDemo online={online} setOnline={setOnline} />
          </Reveal>
          <Reveal delay={0.15} className="mt-6">
            <p className="mb-3 text-sm font-semibold text-mk-text">{mobile.getApp}</p>
            <div className="flex flex-wrap gap-3">
              <StoreButton href={appLinks.android} label={mobile.stores.android} sub="Get it on" />
              <StoreButton href={appLinks.ios} label={mobile.stores.ios} sub="Download on the" />
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
