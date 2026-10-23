'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { BookOpenCheck, Boxes, Calculator, LayoutDashboard, Smartphone, type LucideIcon } from 'lucide-react';
import { useRef } from 'react';
import { flow } from '@/lib/marketing-content';
import { Reveal } from '../ui/reveal';
import { Section } from '../ui/section';
import { SectionHeading } from '../ui/section-heading';
import { BrickBackground } from '../effects/brick-background';

const icons: Record<(typeof flow.nodes)[number]['icon'], LucideIcon> = {
  phone: Smartphone,
  boxes: Boxes,
  book: BookOpenCheck,
  calc: Calculator,
  chart: LayoutDashboard,
};

/**
 * Five steps joined by a line; once on screen the line draws itself and a dot
 * keeps travelling along it. Horizontal on wide screens, vertical on phones.
 */
export function Flow() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  const reduce = useReducedMotion();
  const play = inView && !reduce;
  const n = flow.nodes.length;

  return (
    <Section aria-label={flow.eyebrow} className="bg-white" background={<BrickBackground />}>
      <Reveal>
        <SectionHeading eyebrow={flow.eyebrow} title={flow.title} subtitle={flow.subtitle} />
      </Reveal>

      <div ref={ref} className="relative mt-14">
        {/* Wide screens: horizontal line through the icon centres. */}
        <svg
          className="absolute left-[10%] right-[10%] top-8 hidden h-2 w-[80%] overflow-visible md:block"
          preserveAspectRatio="none"
          viewBox="0 0 100 2"
          aria-hidden
        >
          <line
            x1="0"
            y1="1"
            x2="100"
            y2="1"
            stroke="rgb(var(--mk-border))"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <motion.line
            x1="0"
            y1="1"
            x2="100"
            y2="1"
            stroke="rgb(var(--mk-primary))"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
          />
        </svg>
        {play && (
          <motion.span
            className="absolute top-[1.85rem] hidden h-3 w-3 -translate-x-1/2 rounded-full bg-mk-amber shadow-[0_0_0_6px_rgb(var(--mk-amber)/0.25)] md:block"
            initial={{ left: '10%', opacity: 0 }}
            animate={{ left: ['10%', '90%'], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3.2, delay: 1.6, repeat: Infinity, repeatDelay: 0.6, ease: 'easeInOut' }}
            aria-hidden
          />
        )}
        {/* Phones: vertical line down the icon column. */}
        <span className="absolute bottom-8 left-8 top-8 w-0.5 bg-mk-border md:hidden" aria-hidden>
          <motion.span
            className="block w-full origin-top bg-mk-primary"
            initial={{ height: reduce ? '100%' : '0%' }}
            animate={inView ? { height: '100%' } : {}}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
          />
        </span>

        <ol className="relative grid gap-8 md:grid-cols-5 md:gap-4">
          {flow.nodes.map((node, i) => {
            const Icon = icons[node.icon];
            return (
              <motion.li
                key={node.title}
                className="flex items-start gap-4 md:flex-col md:items-center md:text-center"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: (i / n) * 1.6 }}
              >
                <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-mk-border bg-white shadow-mk-soft">
                  <Icon className="h-7 w-7 text-mk-primary" aria-hidden />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-mk-primary text-xs font-bold text-white">
                    {i + 1}
                  </span>
                </span>
                <div className="pt-1 md:pt-0">
                  <h3 className="text-base font-bold text-mk-text">{node.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-mk-muted">{node.text}</p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </Section>
  );
}
