'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PageMeta } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  meta: PageMeta;
  onPageChange: (page: number) => void;
  isFetching?: boolean;
}

/** Paging for `{ data, meta }` endpoints. Hides itself when there is one page. */
export function Pagination({ meta, onPageChange, isFetching }: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(meta.total / meta.limit));
  if (meta.total === 0 || lastPage === 1) return null;

  const firstRow = (meta.page - 1) * meta.limit + 1;
  const lastRow = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {firstRow}–{lastRow} of {meta.total}
      </p>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={meta.page <= 1 || isFetching}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {meta.page} of {lastPage}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={meta.page >= lastPage || isFetching}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
