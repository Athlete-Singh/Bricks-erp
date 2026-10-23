'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { faq } from '@/lib/marketing-content';
import { cn } from '@/lib/cn';
import { Reveal } from '../ui/reveal';
import { Section } from '../ui/section';
import { SectionHeading } from '../ui/section-heading';
import { BrickBackground } from '../effects/brick-background';

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();
  return (
    <Section id="faq" className="bg-white" background={<BrickBackground />}>
      <Reveal>
        <SectionHeading eyebrow={faq.eyebrow} title={faq.title} />
      </Reveal>
      <div className="mx-auto mt-10 max-w-3xl divide-y divide-mk-border rounded-[24px] border border-mk-border/80 bg-white/85 shadow-mk-soft backdrop-blur-md">
        {faq.items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q}>
              <h3>
                <button
                  type="button"
                  id={`faq-q-${i}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 rounded-[24px] px-5 py-5 text-left text-base font-semibold text-mk-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mk-primary sm:px-6"
                >
                  {item.q}
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 shrink-0 text-mk-muted transition-transform',
                      isOpen && 'rotate-180 text-mk-primary',
                    )}
                    aria-hidden
                  />
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`faq-a-${i}`}
                    role="region"
                    aria-labelledby={`faq-q-${i}`}
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={reduce ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 leading-relaxed text-mk-muted sm:px-6">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
