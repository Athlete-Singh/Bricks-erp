'use client';

import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatQuantity, isNegativeQuantity, isZeroQuantity, STOCK_MOVEMENT_TYPES } from '@brics/shared';
import { Pagination } from '@/components/shared/pagination';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { messageOf } from '@/features/auth/use-auth';
import { useBrickTypes, useItems, useWarehouses } from '@/features/masters/hooks';
import type { StockRegisterRow } from '@/features/stock/api';
import { useStockRegister } from '@/features/stock/hooks';

const TYPE_LABELS: Record<string, string> = {
  opening: 'Opening',
  purchase: 'Purchase',
  production: 'Production',
  sale: 'Sale',
  wastage: 'Wastage',
  adjustment: 'Adjustment',
  transfer: 'Transfer',
};

const TYPE_TONE: Record<string, 'default' | 'success' | 'warning' | 'muted'> = {
  opening: 'muted',
  purchase: 'success',
  production: 'success',
  sale: 'default',
  wastage: 'warning',
  adjustment: 'warning',
  transfer: 'muted',
};

/** INV-07 — every movement, with a running balance once it means something. */
export default function StockRegisterPage() {
  const [filters, setFilters] = useState<{
    page: number;
    limit: number;
    warehouseId?: string;
    itemId?: string;
    brickTypeId?: string;
    movementType?: string;
    from?: string;
    to?: string;
  }>({ page: 1, limit: 25 });

  const { data, isLoading, isFetching, isError, error } = useStockRegister(filters);
  const { data: warehouses } = useWarehouses({ limit: 100 });
  const { data: items } = useItems({ limit: 100 });
  const { data: grades } = useBrickTypes({ limit: 100 });

  // Any filter change starts over — page 4 of the old filter means nothing.
  const set = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  /**
   * The backend only returns a running balance when the filters narrow to one
   * subject in one warehouse; anything wider would be a meaningless total.
   * Mirrored here so the column can explain its own absence.
   */
  const narrowed = Boolean(filters.warehouseId && (filters.itemId || filters.brickTypeId));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          label="Item"
          value={filters.itemId ?? ''}
          onChange={(e) => set({ itemId: e.target.value || undefined, brickTypeId: undefined })}
        >
          <option value="">All items</option>
          {items?.items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </Select>

        <Select
          label="Brick grade"
          value={filters.brickTypeId ?? ''}
          onChange={(e) => set({ brickTypeId: e.target.value || undefined, itemId: undefined })}
        >
          <option value="">All grades</option>
          {grades?.items.map((g) => (
            <option key={g.id} value={g.id}>
              {g.grade}
            </option>
          ))}
        </Select>

        <Select
          label="Movement"
          value={filters.movementType ?? ''}
          onChange={(e) => set({ movementType: e.target.value || undefined })}
        >
          <option value="">All movements</option>
          {STOCK_MOVEMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t] ?? t}
            </option>
          ))}
        </Select>

        <Input
          label="From"
          type="date"
          value={filters.from ?? ''}
          onChange={(e) => set({ from: e.target.value || undefined })}
        />
        <Input
          label="To"
          type="date"
          value={filters.to ?? ''}
          onChange={(e) => set({ to: e.target.value || undefined })}
        />
      </div>

      {!narrowed && (
        <p className="text-xs text-muted-foreground">
          Pick a warehouse and one item or grade to see a running balance — across different things in different yards a
          running total would not mean anything.
        </p>
      )}

      {isError && <Alert variant="error">{messageOf(error, 'Could not load the register')}</Alert>}
      {isLoading && <Skeleton className="h-64 w-full" role="status" aria-label="Loading" />}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={ScrollText}
          title="No movements"
          description="Nothing has moved in or out under these filters."
        />
      )}

      {data && data.items.length > 0 && <RegisterTable rows={data.items} showBalance={narrowed} />}

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

function RegisterTable({ rows, showBalance }: { rows: StockRegisterRow[]; showBalance: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">Stock movement register</caption>
        <thead>
          <tr className="border-b border-border bg-surface-muted text-xs text-muted-foreground">
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Date
            </th>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Movement
            </th>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Item / Grade
            </th>
            <th scope="col" className="hidden px-3 py-2 text-left font-medium md:table-cell">
              Warehouse
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              In
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Out
            </th>
            {showBalance && (
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Balance
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="whitespace-nowrap px-3 py-2">{formatDate(row.movementDate)}</td>
              <td className="px-3 py-2">
                <Badge variant={TYPE_TONE[row.movementType] ?? 'muted'}>
                  {TYPE_LABELS[row.movementType] ?? row.movementType}
                </Badge>
                {/* An adjustment's reason is the point of recording it. */}
                {row.notes && <p className="mt-0.5 text-xs text-muted-foreground">{row.notes}</p>}
              </td>
              <td className="px-3 py-2 font-medium">{row.subjectName}</td>
              <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">{row.warehouseName}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {isZeroQuantity(row.quantityIn) ? '' : formatQuantity(row.quantityIn)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {isZeroQuantity(row.quantityOut) ? '' : formatQuantity(row.quantityOut)}
              </td>
              {showBalance && (
                <td
                  className={`px-3 py-2 text-right font-medium tabular-nums ${
                    isNegativeQuantity(row.runningBalance) ? 'text-danger' : ''
                  }`}
                >
                  {formatQuantity(row.runningBalance)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
