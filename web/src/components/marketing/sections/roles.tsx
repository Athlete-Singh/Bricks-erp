import { Bell, Check, CheckCircle2, CloudOff, Flame, TrendingUp } from 'lucide-react';
import { roles } from '@/lib/marketing-content';
import { Card } from '../ui/card';
import { Reveal } from '../ui/reveal';
import { Section } from '../ui/section';
import { SectionHeading } from '../ui/section-heading';
import { BrickBackground } from '../effects/brick-background';

type RoleKey = (typeof roles.cards)[number]['key'];

/** A tiny screen per role: what that person actually looks at. */
function RoleMock({ role }: { role: RoleKey }) {
  if (role === 'owner') {
    return (
      <div className="grid gap-2" aria-hidden>
        <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
          <span className="text-xs text-mk-muted">Profit this month</span>
          <span className="flex items-center gap-1 text-sm font-bold text-mk-primary">
            <TrendingUp className="h-3.5 w-3.5" /> ₹5,45,000
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-mk-red-soft px-3 py-2 text-xs font-medium text-mk-red">
          <Bell className="h-3.5 w-3.5 shrink-0" /> Coal 18% above normal · Chamber 5
        </div>
      </div>
    );
  }
  if (role === 'accountant') {
    return (
      <div className="rounded-lg bg-white px-3 py-2 text-xs" aria-hidden>
        <div className="flex justify-between border-b border-mk-border pb-1.5 font-semibold text-mk-muted">
          <span>Trial balance</span>
          <span>Dr = Cr</span>
        </div>
        <div className="flex justify-between pt-1.5 text-mk-text">
          <span>Total</span>
          <span className="flex items-center gap-1 font-bold tabular-nums text-mk-primary">
            ₹48,20,000 <CheckCircle2 className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg bg-white px-3 py-2" aria-hidden>
      <span className="flex items-center gap-2 text-xs font-semibold text-mk-text">
        <Flame className="h-4 w-4 text-mk-primary" /> Firing · 10,600
      </span>
      <span className="flex items-center gap-1 rounded-md bg-mk-amber-soft px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
        <CloudOff className="h-3 w-3" /> Waiting
      </span>
      <span className="col-span-2 rounded-lg bg-mk-primary py-2 text-center text-xs font-bold text-white">Save</span>
    </div>
  );
}

export function Roles() {
  return (
    <Section aria-label={roles.title} className="bg-white" background={<BrickBackground />}>
      <Reveal>
        <SectionHeading eyebrow={roles.eyebrow} title={roles.title} />
      </Reveal>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {roles.cards.map((c, i) => (
          <Reveal key={c.key} delay={i * 0.08} className="h-full">
            <Card className="flex h-full flex-col">
              <div className="rounded-2xl bg-mk-bg p-3">
                <RoleMock role={c.key} />
              </div>
              <h3 className="mt-5 text-xl font-bold text-mk-text">{c.role}</h3>
              <p className="mt-1 text-sm font-medium text-mk-primary">{c.lead}</p>
              <ul className="mt-4 grid gap-2">
                {c.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-mk-text">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-mk-primary" aria-hidden />
                    {b}
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
