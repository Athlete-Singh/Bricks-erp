'use client';

import { Layers } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatINR } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { messageOf } from '@/features/auth/use-auth';
import type { Ledger } from '@/features/accounting/api';
import { useLedgerGroups, useLedgers, useLedgerStatement } from '@/features/accounting/hooks';

/**
 * The chart of accounts (ACC-01) with a ledger statement beside it (ACC-05).
 * Picking a ledger shows its entries with a running balance.
 */
export default function LedgersPage() {
  const { data: ledgers, isLoading } = useLedgers();
  const { data: groups } = useLedgerGroups();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [range, setRange] = useState<{ from?: string; to?: string }>({});

  const groupName = (groupId: string) => groups?.find((g) => g.id === groupId)?.name ?? '—';

  const columns: Column<Ledger>[] = [
    {
      key: 'name',
      header: 'Ledger',
      render: (ledger) => (
        <button
          type="button"
          onClick={() => setSelectedId(ledger.id)}
          className="text-left font-medium text-primary hover:underline"
        >
          {ledger.name}
        </button>
      ),
    },
    { key: 'group', header: 'Group', render: (ledger) => groupName(ledger.groupId) },
    {
      key: 'opening',
      header: 'Opening',
      hideOnMobile: true,
      className: 'text-right',
      render: (ledger) => {
        if (ledger.openingDebit !== '0.00')
          return <span className="tabular-nums">{formatINR(ledger.openingDebit)} Dr</span>;
        if (ledger.openingCredit !== '0.00')
          return <span className="tabular-nums">{formatINR(ledger.openingCredit)} Cr</span>;
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      key: 'status',
      header: '',
      render: (ledger) => (ledger.isSystem ? <Badge variant="muted">Built-in</Badge> : null),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <DataTable
        caption="Chart of accounts"
        columns={columns}
        rows={ledgers ?? []}
        rowKey={(ledger) => ledger.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={Layers}
            title="No ledgers yet"
            description="The chart of accounts is seeded with each company."
          />
        }
      />

      {selectedId && (
        <section className="flex flex-col gap-3 border-t border-border pt-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <Select label="Ledger" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {ledgers?.map((ledger) => (
                <option key={ledger.id} value={ledger.id}>
                  {ledger.name}
                </option>
              ))}
            </Select>
            <Input
              label="From"
              type="date"
              value={range.from ?? ''}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value || undefined }))}
            />
            <Input
              label="To"
              type="date"
              value={range.to ?? ''}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value || undefined }))}
            />
          </div>

          <LedgerStatementView ledgerId={selectedId} range={range} />
        </section>
      )}
    </div>
  );
}

function LedgerStatementView({ ledgerId, range }: { ledgerId: string; range: { from?: string; to?: string } }) {
  const { data, isLoading, isError, error } = useLedgerStatement(ledgerId, range);

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (isError || !data) return <Alert variant="error">{messageOf(error, 'Could not load the statement')}</Alert>;

  const side = data.closing.debit !== '0.00' ? 'Dr' : data.closing.credit !== '0.00' ? 'Cr' : '';
  const closingAmount = data.closing.debit !== '0.00' ? data.closing.debit : data.closing.credit;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          {data.ledger.name}
          <span className="ml-2 text-xs font-normal text-muted-foreground">{data.group.name}</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Closing:{' '}
          <span className="font-semibold tabular-nums text-foreground">
            {formatINR(closingAmount)} {side}
          </span>
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <caption className="sr-only">Statement for {data.ledger.name}</caption>
          <thead>
            <tr className="border-b border-border bg-surface-muted text-xs text-muted-foreground">
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Date
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Voucher
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Narration
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Debit
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Credit
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border text-muted-foreground">
              <td className="px-3 py-2" colSpan={5}>
                Opening balance
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatINR(data.opening.debit !== '0.00' ? data.opening.debit : data.opening.credit)}
              </td>
            </tr>

            {data.rows.map((row) => (
              <tr key={row.voucherId} className="border-b border-border last:border-0">
                <td className="whitespace-nowrap px-3 py-2">{formatDate(row.voucherDate)}</td>
                <td className="whitespace-nowrap px-3 py-2">{row.number}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.narration ?? '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.debit === '0.00' ? '' : formatINR(row.debit)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.credit === '0.00' ? '' : formatINR(row.credit)}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{formatINR(row.runningBalance)}</td>
              </tr>
            ))}

            {data.rows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                  No entries in this period
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-surface-muted font-medium">
              <td className="px-3 py-2" colSpan={3}>
                Total
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatINR(data.totals.debit)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatINR(data.totals.credit)}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatINR(closingAmount)} {side}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
