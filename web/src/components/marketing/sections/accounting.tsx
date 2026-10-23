import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  FileDown,
  FileText,
  Library,
  Scale,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { accounting } from '@/lib/marketing-content';
import { Badge } from '../ui/badge';
import { Reveal } from '../ui/reveal';
import { Section } from '../ui/section';
import { SectionHeading } from '../ui/section-heading';
import { BrickBackground } from '../effects/brick-background';

const icons: Record<(typeof accounting.chips)[number]['icon'], LucideIcon> = {
  book: BookOpen,
  ledger: Library,
  scale: Scale,
  chart: BarChart3,
  wallet: Wallet,
  pdf: FileText,
  export: FileDown,
  clock: Clock,
};

export function Accounting() {
  const d = accounting.dayBook;
  return (
    <Section aria-label={accounting.title} background={<BrickBackground variant="blueprint" />}>
      <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <div>
          <Reveal>
            <SectionHeading align="left" eyebrow={accounting.eyebrow} title={accounting.title} />
          </Reveal>
          <Reveal delay={0.05}>
            <ul className="mt-8 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              {accounting.chips.map((c) => {
                const Icon = icons[c.icon];
                return (
                  <li
                    key={c.label}
                    className="flex items-center gap-3 rounded-xl border border-mk-border bg-white px-4 py-3 text-sm font-semibold text-mk-text shadow-mk-soft"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mk-primary-soft">
                      <Icon className="h-4 w-4 text-mk-primary" aria-hidden />
                    </span>
                    {c.label}
                  </li>
                );
              })}
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 flex items-center gap-2 text-lg font-bold text-mk-primary">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
              {accounting.message}
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="rounded-[24px] border border-mk-border bg-white p-5 shadow-mk-device sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-mk-text">{d.title}</p>
              <span className="text-xs text-mk-muted">{d.voucher}</span>
            </div>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-mk-border text-xs uppercase tracking-wide text-mk-muted">
                  <th scope="col" className="py-2 text-left font-semibold">
                    Account
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    Debit
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    Credit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mk-border">
                {d.lines.map((l) => (
                  <tr key={l.account}>
                    <td className="py-3 font-medium text-mk-text">{l.account}</td>
                    <td className="py-3 text-right tabular-nums text-mk-text">{l.debit || '—'}</td>
                    <td className="py-3 text-right tabular-nums text-mk-text">{l.credit || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-mk-text/10 font-bold">
                  <td className="py-3 text-mk-text">Total</td>
                  <td className="py-3 text-right tabular-nums text-mk-text">{d.total}</td>
                  <td className="py-3 text-right tabular-nums text-mk-text">{d.total}</td>
                </tr>
              </tfoot>
            </table>
            <Badge className="mt-2">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {d.balanced}
            </Badge>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
