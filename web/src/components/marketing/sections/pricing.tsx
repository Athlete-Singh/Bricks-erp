'use client';

import { Check } from 'lucide-react';
import { pricing } from '@/lib/marketing-content';
import { cn } from '@/lib/cn';
import { openDemo } from '../demo';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { formatIndian } from '../ui/count-up';
import { Reveal } from '../ui/reveal';
import { Section } from '../ui/section';
import { SectionHeading } from '../ui/section-heading';
import { MeshBlobs } from '../effects/ambient';
import { BrickBackground } from '../effects/brick-background';

export function Pricing() {
  return (
    <Section
      id="pricing"
      background={
        <>
          <BrickBackground intensity="medium" />
          <MeshBlobs tones={['green', 'amber']} />
        </>
      }
    >
      <Reveal>
        <SectionHeading eyebrow={pricing.eyebrow} title={pricing.title} subtitle={pricing.subtitle} />
      </Reveal>
      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        {pricing.plans.map((plan, i) => (
          <Reveal key={plan.key} delay={i * 0.08} className="h-full">
            <div
              className={cn(
                'group relative flex h-full flex-col rounded-[24px] border bg-white/85 p-6 shadow-mk-soft backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:shadow-mk-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-8',
                plan.featured ? 'border-mk-primary ring-4 ring-mk-primary-soft' : 'border-mk-border',
              )}
            >
              {plan.featured && (
                <Badge className="absolute -top-3 left-6 bg-mk-primary text-white">{pricing.popular}</Badge>
              )}
              <h3 className="text-lg font-bold text-mk-text">{plan.name}</h3>
              <p className="mt-1 text-sm text-mk-muted">{plan.note}</p>
              <div className="mt-6">
                {'setup' in plan && (
                  <p className="text-sm text-mk-muted">
                    <span className="font-semibold text-mk-text">₹{formatIndian(plan.setup)}</span> one-time setup, then
                  </p>
                )}
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold tracking-tight text-mk-text">
                    ₹{formatIndian(plan.price)}
                  </span>
                  <span className="text-sm text-mk-muted">{plan.unit}</span>
                </p>
              </div>
              <ul className="mt-6 grid flex-1 gap-2.5">
                {pricing.included.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-mk-text">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-mk-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                variant={plan.featured ? 'primary' : 'outline'}
                className="mt-8 w-full"
                onClick={openDemo}
              >
                {pricing.cta}
              </Button>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
