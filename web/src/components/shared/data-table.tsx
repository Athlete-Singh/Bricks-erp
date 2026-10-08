import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/skeleton';

export interface Column<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  /** Hide on phones where the column is secondary; it still shows in the card. */
  hideOnMobile?: boolean;
  className?: string;
}

interface DataTableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  isLoading?: boolean;
  empty?: ReactNode;
  caption?: string;
}

/**
 * One list layout everywhere (CONVENTIONS → Web). A real table from `sm` up;
 * below that each row becomes a stacked card, because a supervisor entering
 * data in the field should never have to scroll a table sideways on a phone.
 */
export function DataTable<Row>({ columns, rows, rowKey, isLoading, empty, caption }: DataTableProps<Row>) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" role="status" aria-label="Loading">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) return <>{empty}</>;

  return (
    <>
      {/* Phones: one card per row */}
      <ul className="flex flex-col gap-2 sm:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-lg border border-border bg-surface p-3">
            <dl className="flex flex-col gap-1.5">
              {columns.map((column) => (
                <div key={column.key} className="flex items-start justify-between gap-3">
                  <dt className="text-xs text-muted-foreground">{column.header}</dt>
                  <dd className="min-w-0 text-right text-sm text-foreground">{column.render(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      {/* Tablet and up: a table */}
      <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
        <table className="w-full border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-3 py-2 text-left text-xs font-medium text-muted-foreground',
                    column.hideOnMobile && 'hidden md:table-cell',
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-3 py-2.5 text-foreground',
                      column.hideOnMobile && 'hidden md:table-cell',
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
