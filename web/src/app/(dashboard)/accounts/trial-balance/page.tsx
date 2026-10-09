'use client';

import { Scale } from 'lucide-react';
import { useState } from 'react';
import { formatINR } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { messageOf } from '@/features/auth/use-auth';
import type { TrialBalance } from '@/features/accounting/api';
import { useTrialBalance } from '@/features/accounting/hooks';

/**
 * ACC-05. The headline is whether it balances: `PostingService` cannot write an
 * unbalanced journal, so a difference here comes from opening balances (ACC-04)
 * and is worth putting in front of the owner rather than burying.
 */
export default function TrialBalancePage() {
  const [params, setParams] = useState<{ asOf?: string; from?: string; includeZero?: 'true' | 'false' }>({});
  const { data, isLoading, isError, error } = useTrialBalance(params);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" role="status" aria-label="Loading">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState icon={Scale} title="Could not load the Trial Balance" description={messageOf(error, 'Try again.')} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="From"
          type="date"
          value={params.from ?? ''}
          onChange={(e) => setParams((p) => ({ ...p, from: e.target.value || undefined }))}
        />
        <Input
          label="As at"
          type="date"
          value={params.asOf ?? ''}
          onChange={(e) => setParams((p) => ({ ...p, asOf: e.target.value || undefined }))}
        />
        <label className="flex items-end gap-2 pb-1.5 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
            checked={params.includeZero === 'true'}
            onChange={(e) => setParams((p) => ({ ...p, includeZero: e.target.checked ? 'true' : 'false' }))}
          />
          <span>Show ledgers with no activity</span>
        </label>
      </div>

      {data.isBalanced ? (
        <Alert variant="success">
          The books balance — debits and credits both total {formatINR(data.totals.closingDebit)}.
        </Alert>
      ) : (
        <Alert variant="warning">
          Out of balance by <strong>{formatINR(data.difference.replace('-', ''))}</strong>. Every voucher balances by
          construction, so the difference is in the opening balances — check them in Settings.
        </Alert>
      )}

      <TrialBalanceTable data={data} />
    </div>
  );
}

function TrialBalanceTable({ data }: { data: TrialBalance }) {
  if (data.rows.length === 0) {
    return (
      <EmptyState
        icon={Scale}
        title="Nothing posted yet"
        description="The trial balance fills in as vouchers are posted."
      />
    );
  }

  // Grouped the way an accountant reads it, in the chart's own order.
  const byGroup = new Map<string, TrialBalance['rows']>();
  for (const row of data.rows) {
    const list = byGroup.get(row.groupName) ?? [];
    list.push(row);
    byGroup.set(row.groupName, list);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">Trial Balance as at {data.asOf}</caption>
        <thead>
          <tr className="border-b border-border bg-surface-muted text-xs text-muted-foreground">
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Ledger
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Opening
            </th>
            <th scope="col" className="hidden px-3 py-2 text-right font-medium md:table-cell">
              Debit
            </th>
            <th scope="col" className="hidden px-3 py-2 text-right font-medium md:table-cell">
              Credit
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Closing Dr
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Closing Cr
            </th>
          </tr>
        </thead>

        {[...byGroup.entries()].map(([groupName, rows]) => (
          <tbody key={groupName}>
            <tr className="border-b border-border bg-surface-muted/50">
              <th
                scope="colgroup"
                colSpan={6}
                className="px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground"
              >
                {groupName}
              </th>
            </tr>
            {rows.map((row) => (
              <tr key={row.ledgerId} className="border-b border-border last:border-0">
                <td className="px-3 py-2 pl-6">{row.ledgerName}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {row.openingDebit !== '0.00'
                    ? `${formatINR(row.openingDebit)} Dr`
                    : row.openingCredit !== '0.00'
                      ? `${formatINR(row.openingCredit)} Cr`
                      : '—'}
                </td>
                <td className="hidden px-3 py-2 text-right tabular-nums md:table-cell">
                  {row.periodDebit === '0.00' ? '' : formatINR(row.periodDebit)}
                </td>
                <td className="hidden px-3 py-2 text-right tabular-nums md:table-cell">
                  {row.periodCredit === '0.00' ? '' : formatINR(row.periodCredit)}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {row.closingDebit === '0.00' ? '' : formatINR(row.closingDebit)}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {row.closingCredit === '0.00' ? '' : formatINR(row.closingCredit)}
                </td>
              </tr>
            ))}
          </tbody>
        ))}

        <tfoot>
          <tr className="border-t-2 border-border bg-surface-muted font-semibold">
            <td className="px-3 py-2">Total</td>
            <td className="px-3 py-2" />
            <td className="hidden px-3 py-2 text-right tabular-nums md:table-cell">
              {formatINR(data.totals.periodDebit)}
            </td>
            <td className="hidden px-3 py-2 text-right tabular-nums md:table-cell">
              {formatINR(data.totals.periodCredit)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{formatINR(data.totals.closingDebit)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{formatINR(data.totals.closingCredit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
