'use client';

import { Wallet } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS, formatDate, formatINR, todayISO } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { messageOf, useSession } from '@/features/auth/use-auth';
import type { BookAccount } from '@/features/financials/api';
import { useBook } from '@/features/financials/hooks';

function startOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/** ACC-07 — the cash book and the bank book, with the running balance. */
export default function CashBankPage() {
  const { can, sites } = useSession();
  const [kind, setKind] = useState<'cash' | 'bank'>('cash');
  const [filters, setFilters] = useState({ fromDate: startOfMonth(), toDate: todayISO(), siteId: '' });

  const { data, isLoading, isError, error } = useBook(kind, {
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    siteId: filters.siteId || undefined,
  });

  if (!can(PERMISSIONS.ACCOUNTS_VIEW)) {
    return <Alert variant="info">You do not have access to the accounts.</Alert>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Select label="Book" value={kind} onChange={(e) => setKind(e.target.value as 'cash' | 'bank')}>
          <option value="cash">Cash book</option>
          <option value="bank">Bank book</option>
        </Select>
        <Input
          label="From"
          type="date"
          value={filters.fromDate}
          onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
        />
        <Input
          label="To"
          type="date"
          value={filters.toDate}
          onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
        />
        <Select
          label="Kiln"
          value={filters.siteId}
          onChange={(e) => setFilters((f) => ({ ...f, siteId: e.target.value }))}
        >
          <option value="">All kilns</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      {isError && <Alert variant="error">{messageOf(error)}</Alert>}

      {data?.meta && (
        <div className="grid gap-3 sm:grid-cols-4">
          <SummaryCard label="Opening" value={formatINR(data.meta.opening)} />
          <SummaryCard label="Money in" value={formatINR(data.meta.moneyIn)} />
          <SummaryCard label="Money out" value={formatINR(data.meta.moneyOut)} />
          <SummaryCard label="Closing" value={formatINR(data.meta.closing)} strong />
        </div>
      )}

      {isLoading && <Skeleton className="h-40 w-full" />}

      {!isLoading && (data?.items.length ?? 0) === 0 && (
        <EmptyState
          icon={Wallet}
          title={kind === 'cash' ? 'No cash account yet' : 'No bank account yet'}
          description="Add one under Accounts, and every movement through it shows here."
        />
      )}

      {data?.items.map((account) => (
        <AccountBook key={account.ledgerId} account={account} kind={kind} />
      ))}
    </div>
  );
}

function AccountBook({ account, kind }: { account: BookAccount; kind: 'cash' | 'bank' }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">{account.ledgerName}</h2>
        <p className="text-xs text-muted-foreground">
          Opening {formatINR(account.opening)} · in {formatINR(account.moneyIn)} · out {formatINR(account.moneyOut)} ·{' '}
          <span className="font-medium text-foreground">closing {formatINR(account.closing)}</span>
        </p>
      </div>

      {account.entries.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">Nothing moved through this account.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-2 font-medium">Date</th>
                <th className="py-1.5 pr-2 font-medium">Voucher</th>
                <th className="py-1.5 pr-2 font-medium">Against</th>
                {kind === 'bank' && <th className="py-1.5 pr-2 font-medium">Reference</th>}
                <th className="py-1.5 pr-2 text-right font-medium">In</th>
                <th className="py-1.5 pr-2 text-right font-medium">Out</th>
                <th className="py-1.5 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {account.entries.map((entry) => (
                <tr key={entry.voucherId} className="border-b border-border/60 last:border-0">
                  <td className="py-1.5 pr-2 whitespace-nowrap">{formatDate(entry.date)}</td>
                  <td className="py-1.5 pr-2 whitespace-nowrap">{entry.number}</td>
                  {/* The other side of the entry, so a row reads on its own. */}
                  <td className="py-1.5 pr-2">{entry.counterparty ?? '—'}</td>
                  {kind === 'bank' && <td className="py-1.5 pr-2">{entry.instrumentRef ?? '—'}</td>}
                  <td className="py-1.5 pr-2 text-right">{entry.moneyIn === '0.00' ? '' : formatINR(entry.moneyIn)}</td>
                  <td className="py-1.5 pr-2 text-right">
                    {entry.moneyOut === '0.00' ? '' : formatINR(entry.moneyOut)}
                  </td>
                  <td className="py-1.5 text-right font-medium">{formatINR(entry.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SummaryCard({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={strong ? 'text-lg font-semibold text-foreground' : 'text-lg text-foreground'}>{value}</p>
    </div>
  );
}
