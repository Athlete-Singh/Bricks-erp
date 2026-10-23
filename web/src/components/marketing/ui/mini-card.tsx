import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react';
import type { MiniCard as MiniCardData, MiniTone } from '@/lib/marketing-content';
import { cn } from '@/lib/cn';

const toneStyle: Record<MiniTone, { icon: LucideIcon; className: string }> = {
  good: { icon: CheckCircle2, className: 'bg-mk-primary-soft text-mk-primary' },
  warn: { icon: AlertTriangle, className: 'bg-mk-amber-soft text-amber-800' },
  bad: { icon: XCircle, className: 'bg-mk-red-soft text-mk-red' },
  info: { icon: Info, className: 'bg-blue-50 text-blue-700' },
};

/** A small app-like card: a title, a few label/value rows, a status line. */
export function MiniCard({ card, className }: { card: MiniCardData; className?: string }) {
  const { icon: Icon, className: tone } = toneStyle[card.status.tone];
  return (
    <div className={cn('rounded-2xl border border-mk-border bg-white p-4 shadow-mk-soft', className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-mk-muted">{card.title}</p>
      <dl className="mt-3 divide-y divide-mk-border">
        {card.rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 py-2 text-sm">
            <dt className="text-mk-muted">{r.label}</dt>
            <dd className="font-semibold tabular-nums text-mk-text">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className={cn('mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold', tone)}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        {card.status.text}
      </p>
    </div>
  );
}
