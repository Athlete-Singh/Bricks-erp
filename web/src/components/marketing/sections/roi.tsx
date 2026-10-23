'use client';

import { AnimatePresence, animate, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { roi } from '@/lib/marketing-content';
import { openDemo } from '../demo';
import { BrickBackground } from '../effects/brick-background';
import { Button } from '../ui/button';
import { formatIndian } from '../ui/count-up';
import { Reveal } from '../ui/reveal';
import { Section } from '../ui/section';
import { SectionHeading } from '../ui/section-heading';

const LAKH = 100000;

/** "₹7.4 lakh" / "₹1.2 crore" — how owners say big money. */
function inWords(rupees: number): string {
  if (rupees >= 100 * LAKH) return `₹${formatIndian(rupees / (100 * LAKH), 2)} crore`;
  return `₹${formatIndian(rupees / LAKH, 1)} lakh`;
}

/** A number that glides to each new value instead of jumping. */
function useTweened(value: number): number {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduce) {
      setShown(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => {
        from.current = v;
        setShown(v);
      },
    });
    return () => controls.stop();
  }, [value, reduce]);
  return shown;
}

function Range({
  id,
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-mk-text">
          {label}
        </label>
        <span className="text-lg font-bold tabular-nums text-mk-primary">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-mk-border accent-mk-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary focus-visible:ring-offset-2"
      />
      <div className="mt-1 flex justify-between text-xs text-mk-muted" aria-hidden>
        <span>{min === roi.price.min ? `₹${formatIndian(min)}` : min}</span>
        <span>{max === roi.price.max ? `₹${formatIndian(max)}` : max}</span>
      </div>
    </div>
  );
}

const BAR_BRICKS = 16;

/** A bar laid in bricks: changing the value adds or knocks off bricks one at a time. */
function BrickBar({ count, className }: { count: number; className: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex h-5 items-end gap-[3px] rounded-md bg-white/70 p-[3px]">
      <AnimatePresence initial={false}>
        {Array.from({ length: count }, (_, i) => (
          <motion.span
            key={i}
            className={`block h-full w-[calc((100%-45px)/16)] rounded-[3px] ${className} shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)]`}
            initial={reduce ? false : { opacity: 0, y: -10, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 6, scale: 0.6, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 24, delay: reduce ? 0 : i * 0.015 }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Roi() {
  const [lakhBricks, setLakhBricks] = useState<number>(roi.bricks.initial);
  const [price, setPrice] = useState<number>(roi.price.initial);
  const [leak, setLeak] = useState<number>(roi.leakage.initial);

  const seasonValue = ((lakhBricks * LAKH) / 1000) * price;
  const lostWithout = seasonValue * (leak / 100);
  const lostWith = lostWithout * (1 - roi.recoveredShare);
  const saving = lostWithout - lostWith;
  const shown = useTweened(saving);

  return (
    <Section id="roi" background={<BrickBackground variant="stacked" />}>
      <Reveal>
        <SectionHeading eyebrow={roi.eyebrow} title={roi.title} subtitle={roi.subtitle} />
      </Reveal>
      <Reveal delay={0.1}>
        <div className="mt-12 grid overflow-hidden rounded-[24px] border border-mk-border bg-white shadow-mk-soft lg:grid-cols-2">
          <div className="grid gap-8 p-6 sm:p-8">
            <Range
              id="roi-bricks"
              label={roi.bricks.label}
              value={lakhBricks}
              display={`${formatIndian(lakhBricks)} ${roi.bricks.unit}`}
              min={roi.bricks.min}
              max={roi.bricks.max}
              step={roi.bricks.step}
              onChange={setLakhBricks}
            />
            <Range
              id="roi-price"
              label={roi.price.label}
              value={price}
              display={`₹${formatIndian(price)}`}
              min={roi.price.min}
              max={roi.price.max}
              step={roi.price.step}
              onChange={setPrice}
            />
            <Range
              id="roi-leak"
              label={roi.leakage.label}
              value={leak}
              display={`${formatIndian(leak, leak % 1 ? 1 : 0)}${roi.leakage.unit}`}
              min={roi.leakage.min}
              max={roi.leakage.max}
              step={roi.leakage.step}
              onChange={setLeak}
            />
          </div>

          <div className="flex flex-col justify-between gap-6 bg-mk-primary-soft p-6 sm:p-8">
            <div aria-live="polite">
              <p className="text-base font-medium text-mk-text">{roi.resultLead}</p>
              <p className="mt-1 text-4xl font-extrabold tracking-tight text-mk-primary sm:text-5xl">
                {inWords(shown)}
              </p>
              <p className="mt-1 text-base font-medium text-mk-text">{roi.resultTail}</p>
            </div>

            <div className="grid gap-3" aria-hidden>
              {[
                { label: roi.chart.without, value: lostWithout, className: 'bg-mk-red' },
                { label: roi.chart.with, value: lostWith, className: 'bg-mk-primary' },
              ].map((bar) => (
                <div key={bar.label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-mk-text">{bar.label}</span>
                    <span className="font-semibold tabular-nums text-mk-text">{inWords(bar.value)}</span>
                  </div>
                  <BrickBar
                    count={lostWithout > 0 ? Math.max(1, Math.round((bar.value / lostWithout) * BAR_BRICKS)) : 0}
                    className={bar.className}
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-mk-muted">{roi.disclaimer}</p>
              <Button size="lg" onClick={openDemo}>
                {roi.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
