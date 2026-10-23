import { CheckCircle2 } from 'lucide-react';
import type { TourModule, TourTable, Tone } from '@/lib/marketing-content';
import { cn } from '@/lib/cn';
import { Badge, type BadgeTone } from '../ui/badge';
import { formatIndian } from '../ui/count-up';
import { Hotspot } from '../ui/hotspot';

const toneToBadge: Record<Tone, BadgeTone> = {
  good: 'green',
  warn: 'amber',
  bad: 'red',
  info: 'blue',
  neutral: 'neutral',
};

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border border-mk-border bg-white', className)}>{children}</div>;
}

/** A rounded app table. The hotspot, if any, sits on the first status cell or the last column. */
function MockTable({ table, hotspot }: { table: TourTable; hotspot?: string }) {
  const hasStatus = table.rows.some((r) => r.status);
  const columns = table.columns;
  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[30rem] text-left text-sm">
        <thead>
          <tr className="border-b border-mk-border bg-mk-bg text-xs font-semibold uppercase tracking-wide text-mk-muted">
            {columns.map((c, i) => (
              <th
                key={c}
                scope="col"
                className={cn('px-4 py-2.5 font-semibold', table.numeric?.includes(i) && 'text-right')}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-mk-border">
          {table.rows.map((row, r) => (
            <tr key={row.cells[0]! + r} className="text-mk-text">
              {row.cells.map((cell, i) => (
                <td
                  key={i}
                  className={cn(
                    'whitespace-nowrap px-4 py-3',
                    i === 0 && 'font-semibold',
                    table.numeric?.includes(i) && 'text-right tabular-nums',
                    !hasStatus &&
                      i === row.cells.length - 1 &&
                      table.numeric?.includes(i) &&
                      'font-semibold text-mk-primary',
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {cell}
                    {hotspot && r === 0 && !hasStatus && i === row.cells.length - 1 && (
                      <Hotspot tip={hotspot} side="bottom" />
                    )}
                  </span>
                </td>
              ))}
              {row.status && (
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <Badge tone={toneToBadge[row.status.tone]}>{row.status.text}</Badge>
                    {hotspot && r === 0 && <Hotspot tip={hotspot} side="bottom" />}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${36 - ((v - min) / span) * 30}`).join(' ');
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-16 w-full" aria-hidden>
      <polyline points={`0,40 ${points} 100,40`} className="fill-mk-primary/10" />
      <polyline
        points={points}
        fill="none"
        className="stroke-mk-primary"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const attendanceTone = { Present: 'green', 'Half Day': 'amber', Absent: 'red' } as const;

export function TourScreen({ module: m }: { module: TourModule }) {
  switch (m.kind) {
    case 'dashboard': {
      const under = m.cost.benchmark - m.cost.value;
      return (
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {m.kpis.map((k, i) => (
              <Panel key={k.label} className="p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-mk-muted">
                  {k.label}
                  {i === 0 && m.hotspots.kpi && <Hotspot tip={m.hotspots.kpi} side="bottom" />}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-mk-text">{k.value}</p>
                <p className="text-xs text-mk-muted">{k.note}</p>
              </Panel>
            ))}
          </div>
          <Panel className="grid gap-3 p-4 sm:grid-cols-[1fr_1.4fr] sm:items-center">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium text-mk-muted">
                Cost per 1,000 bricks
                {m.hotspots.cost && <Hotspot tip={m.hotspots.cost} side="bottom" />}
              </p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-mk-primary">₹{formatIndian(m.cost.value)}</p>
              <p className="text-xs text-mk-muted">Benchmark ₹{formatIndian(m.cost.benchmark)}</p>
              <Badge className="mt-2">₹{formatIndian(under)} under benchmark</Badge>
            </div>
            <Sparkline values={m.trend} />
          </Panel>
        </div>
      );
    }
    case 'table':
      return <MockTable table={m.table} hotspot={Object.values(m.hotspots)[0]} />;
    case 'attendance':
      return (
        <Panel>
          <div className="flex items-center justify-between border-b border-mk-border px-4 py-3">
            <p className="text-sm font-semibold text-mk-text">{m.date}</p>
            <span className="flex items-center gap-1.5 text-xs font-medium text-mk-muted">
              Advances
              {m.hotspots.advance && <Hotspot tip={m.hotspots.advance} side="bottom" />}
            </span>
          </div>
          <ul className="divide-y divide-mk-border">
            {m.people.map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mk-primary-soft text-sm font-bold text-mk-primary">
                    {p.name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-mk-text">{p.name}</p>
                    <p className="truncate text-xs text-mk-muted">{p.role}</p>
                  </div>
                </div>
                <Badge tone={attendanceTone[p.status]}>{p.status}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      );
    case 'sales':
      return (
        <div className="grid gap-3">
          <MockTable table={m.table} />
          <Panel className="p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-mk-muted">
              Receivable ageing
              {m.hotspots.ageing && <Hotspot tip={m.hotspots.ageing} />}
            </p>
            <div className="mt-3 grid gap-2">
              {m.ageing.map((a, i) => (
                <div key={a.label} className="grid grid-cols-[6rem_1fr_auto] items-center gap-3 text-xs">
                  <span className="text-mk-muted">{a.label}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-mk-bg">
                    <span
                      className={cn(
                        'block h-full rounded-full',
                        ['bg-mk-primary', 'bg-mk-amber', 'bg-mk-red'][i] ?? 'bg-mk-primary',
                      )}
                      style={{ width: `${a.percent}%` }}
                    />
                  </span>
                  <span className="font-semibold tabular-nums text-mk-text">{a.amount}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      );
    case 'reports':
      return (
        <Panel>
          <div className="mk-no-scrollbar flex gap-1 overflow-x-auto border-b border-mk-border px-2 pt-2">
            {m.tabs.map((t) => (
              <span
                key={t}
                className={cn(
                  'whitespace-nowrap rounded-t-lg px-3 py-2 text-xs font-semibold',
                  t === 'P&L' ? 'border-b-2 border-mk-primary text-mk-primary' : 'text-mk-muted',
                )}
              >
                {t}
              </span>
            ))}
          </div>
          <dl className="divide-y divide-mk-border px-4">
            {m.rows.map((r) => (
              <div
                key={r.label}
                className={cn('flex justify-between py-2.5 text-sm', r.bold && 'font-bold text-mk-primary')}
              >
                <dt className={cn('flex items-center gap-1.5', !r.bold && 'text-mk-muted')}>
                  {r.label}
                  {r.bold && m.hotspots.profit && <Hotspot tip={m.hotspots.profit} />}
                </dt>
                <dd className="tabular-nums">{r.value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      );
    case 'settings':
      return (
        <Panel className="grid gap-3 p-4 sm:grid-cols-2">
          {m.fields.map((f) => (
            <div key={f.label}>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-mk-muted">
                {f.label}
                {f.label === 'GSTIN' && m.hotspots.gstin && <Hotspot tip={m.hotspots.gstin} />}
              </p>
              <div className="rounded-lg border border-mk-border bg-mk-bg px-3 py-2 text-sm text-mk-text">
                {f.value}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 text-xs font-medium text-mk-primary sm:col-span-2">
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Saved
          </div>
        </Panel>
      );
  }
}
