'use client';

import { BookOpen, Undo2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { formatDate, formatINR, PERMISSIONS } from '@brics/shared';
import { Pagination } from '@/components/shared/pagination';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { messageOf, useSession } from '@/features/auth/use-auth';
import type { DayBookEntry } from '@/features/accounting/api';
import { useDayBook, useReverseVoucher, useVoucherTypes } from '@/features/accounting/hooks';
import { cn } from '@/lib/cn';

/** ACC-05 — every voucher of a period with the entries it made. */
function DayBook() {
  const { can } = useSession();
  const params = useSearchParams();
  const highlightId = params.get('highlight');

  const [filters, setFilters] = useState<{
    page: number;
    limit: number;
    from?: string;
    to?: string;
    voucherType?: string;
  }>({
    page: 1,
    limit: 25,
  });
  const { data, isLoading, isFetching, isError, error } = useDayBook(filters);
  const { data: voucherTypes } = useVoucherTypes();
  const reverse = useReverseVoucher();

  const setFilter = (patch: Partial<typeof filters>) => setFilters((prev) => ({ ...prev, ...patch, page: 1 }));
  const canManage = can(PERMISSIONS.ACCOUNTS_MANAGE);
  const hasFilters = Boolean(filters.from || filters.to || filters.voucherType);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="From"
          type="date"
          value={filters.from ?? ''}
          onChange={(e) => setFilter({ from: e.target.value || undefined })}
        />
        <Input
          label="To"
          type="date"
          value={filters.to ?? ''}
          onChange={(e) => setFilter({ to: e.target.value || undefined })}
        />
        <Select
          label="Voucher type"
          value={filters.voucherType ?? ''}
          onChange={(e) => setFilter({ voucherType: e.target.value || undefined })}
        >
          <option value="">All types</option>
          {voucherTypes?.map((type) => (
            <option key={type.id} value={type.code}>
              {type.name}
            </option>
          ))}
        </Select>
        {hasFilters && (
          <div className="flex items-end">
            <Button size="sm" variant="ghost" onClick={() => setFilters({ page: 1, limit: 25 })}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load the Day Book')}</Alert>}
      {reverse.isError && <Alert variant="error">{messageOf(reverse.error, 'Could not reverse the voucher')}</Alert>}

      {isLoading && (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title={hasFilters ? 'No vouchers in this period' : 'No vouchers yet'}
          description={hasFilters ? 'Try widening the date range.' : 'Post your first voucher to start the books.'}
        />
      )}

      <div className="flex flex-col gap-3">
        {data?.items.map((entry) => (
          <VoucherCard
            key={entry.voucherId}
            entry={entry}
            highlighted={entry.voucherId === highlightId}
            canManage={canManage}
            isReversing={reverse.isPending && reverse.variables?.id === entry.voucherId}
            onReverse={() => reverse.mutate({ id: entry.voucherId, dto: { narration: null } })}
          />
        ))}
      </div>

      {data && (
        <Pagination
          meta={data.meta}
          isFetching={isFetching}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
        />
      )}
    </div>
  );
}

function VoucherCard({
  entry,
  highlighted,
  canManage,
  isReversing,
  onReverse,
}: {
  entry: DayBookEntry;
  highlighted: boolean;
  canManage: boolean;
  isReversing: boolean;
  onReverse: () => void;
}) {
  const isReversed = entry.status === 'reversed';
  // A reversal cannot itself be reversed — the backend refuses it, so do not
  // offer a button that is guaranteed to fail.
  const isAReversal = entry.reversalOfId !== null;

  return (
    <article
      className={cn(
        'rounded-lg border bg-surface p-3 transition-colors',
        highlighted ? 'border-primary ring-1 ring-primary' : 'border-border',
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{entry.number}</span>
            <Badge variant="muted">{entry.voucherType}</Badge>
            {isReversed && <Badge variant="warning">Reversed</Badge>}
            {isAReversal && <Badge variant="muted">Reversal</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDate(entry.voucherDate)}
            {entry.narration ? ` · ${entry.narration}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums text-foreground">{formatINR(entry.totalDebit)}</span>
          {canManage && !isReversed && !isAReversal && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReverse}
              disabled={isReversing}
              title="A posted voucher cannot be edited — this writes its mirror"
            >
              {isReversing ? <Spinner className="h-3 w-3" /> : <Undo2 className="h-3.5 w-3.5" aria-hidden />}
              Reverse
            </Button>
          )}
        </div>
      </header>

      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">Entries for voucher {entry.number}</caption>
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th scope="col" className="pb-1 text-left font-medium">
              Ledger
            </th>
            <th scope="col" className="pb-1 text-right font-medium">
              Debit
            </th>
            <th scope="col" className="pb-1 text-right font-medium">
              Credit
            </th>
          </tr>
        </thead>
        <tbody>
          {entry.lines.map((line, index) => (
            <tr key={`${line.ledgerId}-${index}`} className="border-t border-border/60">
              <td className="py-1.5 pr-2">{line.ledgerName}</td>
              <td className="py-1.5 text-right tabular-nums">{line.debit === '0.00' ? '' : formatINR(line.debit)}</td>
              <td className="py-1.5 text-right tabular-nums">{line.credit === '0.00' ? '' : formatINR(line.credit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

export default function DayBookPage() {
  // `useSearchParams` needs a Suspense boundary in the app router.
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <DayBook />
    </Suspense>
  );
}
