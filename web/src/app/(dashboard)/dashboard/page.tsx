'use client';

import { useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatINR, formatQty } from '@brics/shared';
import { useDashboardMonthly, useDashboardSummary } from '@/features/dashboard/hooks';
import type { DashboardSummary, MonthlyPoint } from '@/features/dashboard/api';
import { MonthlyTrendChart } from '@/features/dashboard/components/monthly-trend-chart';

/**
 * DSH-01 / DSH-02 — the owner's home. Replaces the P0 placeholder tiles with
 * live KMQs and the 12-month trend series.
 *
 * The screen does one network thing it would not have done the day before:
 * when `costPerThousandMtd` is null the tile says *not yet* rather than
 * showing a zero. Zero would read as "it costs nothing to make a brick";
 * null tells the truth, that nothing fired this month.
 */
export default function DashboardPage() {
  const summary = useDashboardSummary();
  const monthly = useDashboardMonthly();
  const data = summary.data?.meta as DashboardSummary | undefined;
  const points = monthly.data?.items as MonthlyPoint[] | undefined;

  const costDelta = useMemo(() => {
    if (!data?.costPerThousandMtd) return null;
    return Number(data.costPerThousandMtd) - Number(data.costPerThousandBenchmark);
  }, [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Where the kiln stands today — production, stock, money, and cost per 1,000"
      />

      {summary.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : summary.isError || !data ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Could not load the dashboard. Check that you are signed in and have accounts access.
          </CardContent>
        </Card>
      ) : (
        <>
          <section aria-label="Key management questions" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label="Production — this month"
              value={`${formatQty(Number(data.production.firedMtd))} fired`}
              hint={`${formatQty(Number(data.production.sortedMtd))} sorted · ${formatQty(Number(data.production.firedYtd))} YTD`}
            />
            <Tile
              label="Bricks on hand"
              value={formatQty(Number(data.stock.bricksProduced))}
              hint={`${data.stock.itemCount} subject${data.stock.itemCount === 1 ? '' : 's'} tracked`}
            />
            <Tile
              label="Sold — this month"
              value={formatINR(data.sold.mtd)}
              hint={`${formatQty(Number(data.dispatched.mtd))} bricks dispatched · ${formatINR(data.sold.collectionMtd)} collected`}
            />
            <Tile
              label="Expenses — this month"
              value={formatINR(data.expenses.mtd)}
              hint={`Coal ${formatINR(data.coalCostMtd)} · Diesel ${formatINR(data.dieselCostMtd)}`}
            />
            <Tile label="Receivables" value={formatINR(data.receivables)} hint="Customers who owe the kiln" />
            <Tile label="Payables" value={formatINR(data.payables)} hint="Suppliers the kiln owes" />
            <Tile
              label="Labour payable"
              value={formatINR(data.labourPayable)}
              hint="Accrued but unpaid wages to Sardars"
            />
            <Tile
              label="Estimated profit — this month"
              value={formatINR(data.estimatedProfitMtd)}
              hint="Income less expense from posted vouchers"
            />
          </section>

          <section aria-labelledby="cost-per-1000">
            <Card>
              <CardHeader>
                <CardTitle id="cost-per-1000">Cost per 1,000 bricks — this month</CardTitle>
              </CardHeader>
              <CardContent>
                {data.costPerThousandMtd === null ? (
                  <div className="text-sm text-muted-foreground">
                    Not yet — nothing was fired this month. The cost per 1,000 appears once a firing stage posts.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="text-3xl font-semibold">{formatINR(data.costPerThousandMtd)}</div>
                      <div className="text-sm text-muted-foreground">
                        against the <span className="font-medium">{formatINR(data.costPerThousandBenchmark)}</span>{' '}
                        benchmark
                      </div>
                    </div>
                    <div>
                      {costDelta !== null && costDelta > 0 ? (
                        <Badge variant="danger" data-testid="cost-over-benchmark">
                          {formatINR(costDelta)} over benchmark
                        </Badge>
                      ) : costDelta !== null && costDelta < 0 ? (
                        <Badge variant="success">{formatINR(Math.abs(costDelta))} under benchmark</Badge>
                      ) : (
                        <Badge variant="muted">on benchmark</Badge>
                      )}
                    </div>
                  </div>
                )}
                {data.grossMarginPercentMtd !== null && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    Gross margin this month:{' '}
                    <span className="font-medium text-foreground">{data.grossMarginPercentMtd}%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="trends">
            <Card>
              <CardHeader>
                <CardTitle id="trends">Trend — rolling 12 months</CardTitle>
              </CardHeader>
              <CardContent>
                {monthly.isLoading ? (
                  <Skeleton className="h-40" />
                ) : !points || points.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No monthly activity yet.</div>
                ) : (
                  <MonthlyTrendChart points={points} />
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
