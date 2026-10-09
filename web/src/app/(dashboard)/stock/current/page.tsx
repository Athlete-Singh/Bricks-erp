'use client';

import { Boxes, Plus, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { useWarehouses } from '@/features/masters/hooks';
import type { CurrentStock, CurrentStockRow } from '@/features/stock/api';
import { OpeningStockDialog, StockAdjustmentDialog } from '@/features/stock/components/stock-entry-dialogs';
import { useCurrentStock } from '@/features/stock/hooks';

/** Quantities are decimal strings; trailing zeros make a count hard to read. */
function qty(value: string): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: 3 }) : value;
}

function isZero(value: string): boolean {
  return Number(value) === 0;
}

/** INV-07 — what each kiln holds, and what moved it there. */
export default function CurrentStockPage() {
  const { can } = useSession();
  const canManage = can(PERMISSIONS.INVENTORY_MANAGE);
  const canAdjust = can(PERMISSIONS.INVENTORY_ADJUST);

  const [filters, setFilters] = useState<{
    asOf?: string;
    from?: string;
    warehouseId?: string;
    subject: 'item' | 'brick' | 'all';
    includeZero: 'true' | 'false';
  }>({ subject: 'all', includeZero: 'false' });

  const [openingOpen, setOpeningOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const { data, isLoading, isError, error } = useCurrentStock(filters);
  const { data: warehouses } = useWarehouses({ limit: 100 });

  const set = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Warehouse"
            value={filters.warehouseId ?? ''}
            onChange={(e) => set({ warehouseId: e.target.value || undefined })}
          >
            <option value="">All warehouses</option>
            {warehouses?.items.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>

          <Select
            label="Showing"
            value={filters.subject}
            onChange={(e) => set({ subject: e.target.value as typeof filters.subject })}
          >
            <option value="all">Items and grades</option>
            <option value="brick">Bricks only</option>
            <option value="item">Materials only</option>
          </Select>

          <Input
            label="From"
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => set({ from: e.target.value || undefined })}
          />
          <Input
            label="As at"
            type="date"
            value={filters.asOf ?? ''}
            onChange={(e) => set({ asOf: e.target.value || undefined })}
          />
        </div>

        <div className="flex shrink-0 gap-2">
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setOpeningOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden /> Opening stock
            </Button>
          )}
          {/* Gated on `inventory.adjust`, not `inventory.manage` — the two are
              separate so a store keeper cannot write off their own shortfall. */}
          {canAdjust && (
            <Button size="sm" onClick={() => setAdjustOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden /> Adjust
            </Button>
          )}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
          checked={filters.includeZero === 'true'}
          onChange={(e) => set({ includeZero: e.target.checked ? 'true' : 'false' })}
        />
        <span>Show things that moved and came back to zero</span>
      </label>

      {isError && <Alert variant="error">{messageOf(error, 'Could not load the stock position')}</Alert>}

      {isLoading && <Skeleton className="h-64 w-full" role="status" aria-label="Loading" />}

      {data && data.rows.length === 0 && (
        <EmptyState
          icon={Boxes}
          title="Nothing in stock yet"
          description={
            canManage
              ? 'Record opening stock, and the rest fills in as goods are received, produced and dispatched.'
              : 'Stock appears here as goods are received, produced and dispatched.'
          }
        />
      )}

      {data && data.rows.length > 0 && <StockTable data={data} asOf={data.asOf} />}

      <OpeningStockDialog open={openingOpen} onClose={() => setOpeningOpen(false)} />
      <StockAdjustmentDialog open={adjustOpen} onClose={() => setAdjustOpen(false)} />
    </div>
  );
}

function StockTable({ data, asOf }: { data: CurrentStock; asOf: string }) {
  // Grouped by kiln, the way an owner thinks about it.
  const bySite = new Map<string, CurrentStockRow[]>();
  for (const row of data.rows) {
    const list = bySite.get(row.siteName) ?? [];
    list.push(row);
    bySite.set(row.siteName, list);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">Stock as at {asOf}</caption>
        <thead>
          <tr className="border-b border-border bg-surface-muted text-xs text-muted-foreground">
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Item / Grade
            </th>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Warehouse
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Opening
            </th>
            <th scope="col" className="hidden px-3 py-2 text-right font-medium lg:table-cell">
              Purchased
            </th>
            <th scope="col" className="hidden px-3 py-2 text-right font-medium lg:table-cell">
              Produced
            </th>
            <th scope="col" className="hidden px-3 py-2 text-right font-medium lg:table-cell">
              Sold
            </th>
            <th scope="col" className="hidden px-3 py-2 text-right font-medium lg:table-cell">
              Wasted
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Adjusted
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Closing
            </th>
          </tr>
        </thead>

        {[...bySite.entries()].map(([siteName, rows]) => (
          <tbody key={siteName}>
            <tr className="border-b border-border bg-surface-muted/50">
              <th
                scope="colgroup"
                colSpan={9}
                className="px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground"
              >
                {siteName}
              </th>
            </tr>
            {rows.map((row) => {
              const adjusted = Number(row.adjustedIn) - Number(row.adjustedOut);
              const negative = Number(row.closing) < 0;
              return (
                <tr key={`${row.warehouseId}-${row.subjectId}`} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <span className="font-medium">{row.subjectName}</span>
                    {row.unit && <span className="ml-1 text-xs text-muted-foreground">({row.unit})</span>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{row.warehouseName}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {isZero(row.opening) ? '—' : qty(row.opening)}
                  </td>
                  <td className="hidden px-3 py-2 text-right tabular-nums lg:table-cell">
                    {isZero(row.purchased) ? '' : qty(row.purchased)}
                  </td>
                  <td className="hidden px-3 py-2 text-right tabular-nums lg:table-cell">
                    {isZero(row.produced) ? '' : qty(row.produced)}
                  </td>
                  <td className="hidden px-3 py-2 text-right tabular-nums lg:table-cell">
                    {isZero(row.sold) ? '' : qty(row.sold)}
                  </td>
                  <td className="hidden px-3 py-2 text-right tabular-nums lg:table-cell">
                    {isZero(row.wasted) ? '' : <span className="text-warning-foreground">{qty(row.wasted)}</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {adjusted === 0 ? '' : adjusted.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-semibold tabular-nums ${
                      negative ? 'text-error-foreground' : ''
                    }`}
                  >
                    {qty(row.closing)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
