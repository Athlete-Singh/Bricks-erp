'use client';

import { useMemo, useState } from 'react';
import { formatINR, formatQty } from '@brics/shared';
import type { MonthlyPoint } from '@/features/dashboard/api';
import { cn } from '@/lib/cn';

type MetricKey = 'productionFired' | 'salesInvoiced' | 'collection' | 'expenses' | 'coalCost' | 'dieselCost';

interface Metric {
  key: MetricKey;
  label: string;
  unit: 'bricks' | 'money';
}

const METRICS: Metric[] = [
  { key: 'productionFired', label: 'Fired bricks', unit: 'bricks' },
  { key: 'salesInvoiced', label: 'Sales', unit: 'money' },
  { key: 'collection', label: 'Collection', unit: 'money' },
  { key: 'expenses', label: 'Expenses', unit: 'money' },
  { key: 'coalCost', label: 'Coal', unit: 'money' },
  { key: 'dieselCost', label: 'Diesel', unit: 'money' },
];

/**
 * DSH-02 trend series. SVG-based, no chart library: twelve points do not need
 * one, and avoiding a new dependency keeps the bundle sized to what the app
 * actually uses. The y-axis adapts per metric; a buyer looking at coal cost
 * and a buyer looking at production fired should not see them on one scale.
 */
export function MonthlyTrendChart({ points }: { points: MonthlyPoint[] }) {
  const [metric, setMetric] = useState<MetricKey>('productionFired');
  const active = METRICS.find((m) => m.key === metric)!;
  const values = useMemo(() => points.map((p) => Number(p[metric])), [points, metric]);
  const max = Math.max(...values, 0);
  const width = 100;
  const height = 32;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Choose a metric">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={metric === m.key}
            onClick={() => setMetric(m.key)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition-colors',
              metric === m.key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-40 w-full min-w-[480px]"
          role="img"
          aria-label={`${active.label} by month`}
        >
          {max === 0 ? (
            <text
              x={width / 2}
              y={height / 2}
              textAnchor="middle"
              fontSize="2"
              fill="currentColor"
              className="text-muted-foreground"
            >
              No {active.label.toLowerCase()} in this window
            </text>
          ) : (
            <>
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="0.4"
                className="text-primary"
                points={values
                  .map((v, i) => {
                    const x = (i / Math.max(1, values.length - 1)) * width;
                    const y = height - (v / max) * (height - 3) - 1;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
              {values.map((v, i) => {
                const x = (i / Math.max(1, values.length - 1)) * width;
                const y = height - (v / max) * (height - 3) - 1;
                return <circle key={i} cx={x} cy={y} r="0.6" className="fill-primary" />;
              })}
            </>
          )}
        </svg>
      </div>

      <ol className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4 lg:grid-cols-6">
        {points.map((p) => (
          <li key={p.month} className="flex items-baseline justify-between gap-2">
            <span>{p.month}</span>
            <span className="tabular-nums text-foreground">
              {active.unit === 'money' ? formatINR(p[metric]) : formatQty(Number(p[metric]))}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
