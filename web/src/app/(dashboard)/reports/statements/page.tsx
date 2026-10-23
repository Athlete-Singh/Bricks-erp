'use client';

import { useState } from 'react';
import { PERMISSIONS, formatINR, todayISO } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { messageOf, useSession } from '@/features/auth/use-auth';
import type { PnlLine } from '@/features/financials/api';
import {
  useBalanceSheet,
  useClosingStock,
  usePartyBalances,
  useProfitAndLoss,
  useSetClosingStockRates,
} from '@/features/financials/hooks';

function startOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/** ACC-08 and ACC-09 — the statements, and the closing stock they rest on. */
export default function StatementsPage() {
  const { can } = useSession();
  const [range, setRange] = useState({ fromDate: startOfMonth(), toDate: todayISO() });
  const [ratesOpen, setRatesOpen] = useState(false);
  const [draftRates, setDraftRates] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const pnl = useProfitAndLoss(range);
  const bs = useBalanceSheet({ asOf: range.toDate });
  const parties = usePartyBalances({ asOf: range.toDate });
  const stock = useClosingStock({ asOf: range.toDate });
  const setRates = useSetClosingStockRates();

  const canManage = can(PERMISSIONS.ACCOUNTS_MANAGE);

  if (!can(PERMISSIONS.ACCOUNTS_VIEW)) {
    return <Alert variant="info">You do not have access to the accounts.</Alert>;
  }

  const saveRates = async () => {
    setError(null);
    const rates = Object.entries(draftRates)
      .filter(([, rate]) => rate.trim() !== '')
      .map(([itemId, rate]) => ({ itemId, rate }));
    if (rates.length === 0) return;
    try {
      await setRates.mutateAsync({ asOf: range.toDate, rates });
      setRatesOpen(false);
    } catch (err) {
      setError(messageOf(err));
    }
  };

  const unvalued = pnl.data?.meta.unvaluedStockGrades ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <Input
            label="From"
            type="date"
            value={range.fromDate}
            onChange={(e) => setRange((r) => ({ ...r, fromDate: e.target.value }))}
          />
          <Input
            label="To (and the Balance Sheet date)"
            type="date"
            value={range.toDate}
            onChange={(e) => setRange((r) => ({ ...r, toDate: e.target.value }))}
          />
        </div>
        {canManage && (
          <Button variant="outline" onClick={() => setRatesOpen(true)}>
            Price the closing stock
          </Button>
        )}
      </div>

      {unvalued > 0 && (
        <Alert variant="warning">
          {unvalued === 1 ? 'One grade in the yard has no' : `${unvalued} grades in the yard have no`} closing rate for
          this date, so {unvalued === 1 ? 'it is' : 'they are'} left out of both statements. Price{' '}
          {unvalued === 1 ? 'it' : 'them'} and the figures below change.
        </Alert>
      )}

      {/* ── P&L ─────────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Profit &amp; Loss</h2>
        {pnl.isLoading && <Skeleton className="h-40 w-full" />}
        {pnl.isError && <Alert variant="error">{messageOf(pnl.error)}</Alert>}
        {pnl.data && (
          <div className="grid gap-3 lg:grid-cols-2">
            <StatementBlock title="Income" lines={pnl.data.meta.directIncome} total={pnl.data.meta.totals.directIncome}>
              {pnl.data.meta.closingStock && (
                <Row label="Closing stock" amount={pnl.data.meta.closingStock.value} muted />
              )}
              {pnl.data.meta.openingStock && (
                <Row label="Less: opening stock" amount={`-${pnl.data.meta.openingStock.value}`} muted />
              )}
            </StatementBlock>
            <StatementBlock
              title="Direct costs"
              lines={pnl.data.meta.directExpenses}
              total={pnl.data.meta.totals.directExpenses}
            />
            <StatementBlock
              title="Other income"
              lines={pnl.data.meta.indirectIncome}
              total={pnl.data.meta.totals.indirectIncome}
            />
            <StatementBlock
              title="Other costs"
              lines={pnl.data.meta.indirectExpenses}
              total={pnl.data.meta.totals.indirectExpenses}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
              <SummaryCard label="Gross profit" value={formatINR(pnl.data.meta.totals.grossProfit)} />
              <SummaryCard
                label="Net profit"
                value={formatINR(pnl.data.meta.totals.netProfit)}
                danger={Number(pnl.data.meta.totals.netProfit) < 0}
                strong
              />
            </div>
          </div>
        )}
      </section>

      {/* ── Balance Sheet ───────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Balance Sheet</h2>
        {bs.isLoading && <Skeleton className="h-40 w-full" />}
        {bs.data && (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              <GroupBlock
                title="Assets"
                groups={bs.data.meta.assets}
                extra={{ label: 'Stock-in-hand', amount: bs.data.meta.closingStock.value }}
                total={bs.data.meta.totals.assets}
              />
              <GroupBlock
                title="Liabilities"
                groups={bs.data.meta.liabilities}
                extra={{ label: 'Retained earnings', amount: bs.data.meta.retainedEarnings }}
                total={bs.data.meta.totals.liabilities}
              />
            </div>
            {bs.data.meta.totals.difference !== '0.00' && (
              <Alert variant="warning">
                Assets and liabilities differ by {formatINR(bs.data.meta.totals.difference)}. Opening balances are
                stored on each party and ledger but no opening journal is posted yet, so a difference here is expected
                until that import lands — it is shown rather than hidden.
              </Alert>
            )}
          </>
        )}
      </section>

      {/* ── ACC-09 ──────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Who owes whom</h2>
        {parties.data && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryCard label="Owed to the kiln" value={formatINR(parties.data.meta.receivable)} />
              <SummaryCard label="Owed by the kiln" value={formatINR(parties.data.meta.payable)} />
            </div>
            {parties.data.items.length === 0 ? (
              <p className="text-xs text-muted-foreground">Every party is square on this date.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border bg-surface">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Party</th>
                      <th className="px-3 py-2 text-right font-medium">They owe</th>
                      <th className="px-3 py-2 text-right font-medium">We owe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parties.data.items.map((p) => (
                      <tr key={p.partyId} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2">{p.name}</td>
                        <td className="px-3 py-2 text-right">
                          {p.receivable === '0.00' ? '' : formatINR(p.receivable)}
                        </td>
                        <td className="px-3 py-2 text-right">{p.payable === '0.00' ? '' : formatINR(p.payable)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <Dialog open={ratesOpen} onClose={() => setRatesOpen(false)} title={`Closing rates as at ${range.toDate}`}>
        <div className="flex flex-col gap-3">
          {error && <Alert variant="error">{error}</Alert>}
          <p className="text-xs text-muted-foreground">
            Enter what a unit of each grade is worth. The quantity is never typed — it comes from the stock ledger, so
            the valuation cannot disagree with the stock register.
          </p>
          {stock.data?.items.length === 0 && <p className="text-sm">Nothing in the yard on this date.</p>}
          {stock.data?.items.map((item) => (
            <div key={item.itemId} className="grid grid-cols-[1fr_7rem] items-end gap-2">
              <div>
                <p className="text-sm">{item.itemName}</p>
                <p className="text-xs text-muted-foreground">{item.quantity} on hand</p>
              </div>
              <Input
                label="Rate"
                inputMode="decimal"
                value={draftRates[item.itemId] ?? item.rate ?? ''}
                onChange={(e) => setDraftRates((d) => ({ ...d, [item.itemId]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRatesOpen(false)}>
              Close
            </Button>
            <Button onClick={() => void saveRates()} disabled={setRates.isPending}>
              Save rates
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function StatementBlock({
  title,
  lines,
  total,
  children,
}: {
  title: string;
  lines: PnlLine[];
  total: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3">
      <h3 className="text-xs font-medium uppercase text-muted-foreground">{title}</h3>
      {lines.length === 0 && !children && <p className="py-2 text-xs text-muted-foreground">Nothing booked.</p>}
      {lines.map((l) => (
        <Row key={l.ledgerId} label={l.ledgerName} amount={l.amount} />
      ))}
      {children}
      <div className="mt-1 flex justify-between border-t border-border pt-1 text-sm font-medium">
        <span>Total</span>
        <span>{formatINR(total)}</span>
      </div>
    </div>
  );
}

function GroupBlock({
  title,
  groups,
  extra,
  total,
}: {
  title: string;
  groups: { groupCode: string; groupName: string; lines: { ledgerName: string; amount: string }[]; total: string }[];
  extra: { label: string; amount: string };
  total: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <h3 className="text-xs font-medium uppercase text-muted-foreground">{title}</h3>
      {groups.map((g) => (
        <div key={g.groupCode} className="flex flex-col">
          <div className="flex justify-between text-sm font-medium">
            <span>{g.groupName}</span>
            <span>{formatINR(g.total)}</span>
          </div>
          {g.lines.map((l) => (
            <Row key={l.ledgerName} label={l.ledgerName} amount={l.amount} muted />
          ))}
        </div>
      ))}
      <Row label={extra.label} amount={extra.amount} />
      <div className="mt-1 flex justify-between border-t border-border pt-1 text-sm font-medium">
        <span>Total</span>
        <span>{formatINR(total)}</span>
      </div>
    </div>
  );
}

function Row({ label, amount, muted }: { label: string; amount: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${muted ? 'pl-3 text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span>{formatINR(amount)}</span>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  danger,
  strong,
}: {
  label: string;
  value: string;
  danger?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg ${strong ? 'font-semibold' : ''} ${danger ? 'text-danger' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}
