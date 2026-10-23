import { DatabaseBackup, Headset, KeyRound, ScrollText, ShieldCheck, type LucideIcon } from 'lucide-react';
import { security } from '@/lib/marketing-content';
import { Card } from '../ui/card';
import { Reveal } from '../ui/reveal';
import { Section } from '../ui/section';
import { SectionHeading } from '../ui/section-heading';
import { BrickBackground } from '../effects/brick-background';

const icons: Record<(typeof security.items)[number]['icon'], LucideIcon> = {
  separate: ShieldCheck,
  roles: KeyRound,
  log: ScrollText,
  support: Headset,
  backup: DatabaseBackup,
};

export function Security() {
  return (
    <Section aria-label={security.eyebrow} className="bg-white" background={<BrickBackground />}>
      <Reveal>
        <SectionHeading eyebrow={security.eyebrow} title={security.title} />
      </Reveal>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {security.items.map((item, i) => {
          const Icon = icons[item.icon];
          return (
            <Reveal key={item.title} delay={i * 0.06} className="h-full">
              <Card className="h-full p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mk-primary-soft">
                  <Icon className="h-5 w-5 text-mk-primary" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-bold leading-snug text-mk-text">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mk-muted">{item.text}</p>
              </Card>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
