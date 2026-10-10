'use client';

import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatDate, formatQuantity, isZeroQuantity, PERMISSIONS } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { useBrickTypes, useItems } from '@/features/masters/hooks';
import type { BatchDetail, ProductionEntry } from '@/features/production/api';
import { DryingForm, FiringForm, MakingForm, SortingForm } from '@/features/production/components/stage-forms';
import { useBatch } from '@/features/production/hooks';

const STAGE_TITLES: Record<string, string> = {
  making: '1 · Making',
  drying: '2 · Drying',
  firing: '3 · Firing',
  sorting: '4 · Sorting',
};

/** A stage already recorded. Read-only: correction is a reversal, not an edit. */
function RecordedStage({ entry, detail }: { entry: ProductionEntry; detail: BatchDetail }) {
  const { data: grades } = useBrickTypes({ limit: 100 });
  const { data: items } = useItems({ limit: 100 });

  const outputs = detail.outputs.filter((o) => o.entryId === entry.id);
  const consumptions = detail.consumptions.filter((c) => c.entryId === entry.id);
  const gradeName = (id: string) => grades?.items.find((g) => g.id === id)?.grade ?? '—';
  const itemName = (id: string) => items?.items.find((i) => i.id === id)?.name ?? '—';

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Check className="h-4 w-4 text-success" aria-hidden />
          {STAGE_TITLES[entry.stage] ?? entry.stage}
        </h3>
        <span className="text-xs text-muted-foreground">{formatDate(entry.entryDate)}</span>
      </div>

      <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {!isZeroQuantity(entry.greenBricks) && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Green bricks</dt>
            <dd className="tabular-nums">{formatQuantity(entry.greenBricks)}</dd>
          </div>
        )}
        {!isZeroQuantity(entry.firedBricks) && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Fired</dt>
            <dd className="tabular-nums">{formatQuantity(entry.firedBricks)}</dd>
          </div>
        )}
        {!isZeroQuantity(entry.brokenBricks) && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Broken</dt>
            <dd className="tabular-nums">{formatQuantity(entry.brokenBricks)}</dd>
          </div>
        )}
        {!isZeroQuantity(entry.rejectBricks) && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Rejects</dt>
            <dd className="tabular-nums">{formatQuantity(entry.rejectBricks)}</dd>
          </div>
        )}
      </dl>

      {outputs.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground">Into finished stock</p>
          <ul className="mt-1 flex flex-col gap-0.5 text-sm">
            {outputs.map((o) => (
              <li key={o.id} className="flex justify-between gap-4">
                <span>{gradeName(o.brickTypeId)}</span>
                <span className="tabular-nums">{formatQuantity(o.quantity)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {consumptions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground">Materials used</p>
          <ul className="mt-1 flex flex-col gap-0.5 text-sm">
            {consumptions.map((c) => (
              <li key={c.id} className="flex justify-between gap-4">
                <span>{itemName(c.itemId)}</span>
                <span className="tabular-nums">{formatQuantity(c.quantity)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {entry.notes && <p className="mt-3 text-xs text-muted-foreground">{entry.notes}</p>}
    </section>
  );
}

export default function BatchDetailPage() {
  const params = useParams<{ id: string }>();
  const { can, sites } = useSession();
  const canManage = can(PERMISSIONS.PRODUCTION_MANAGE);

  const { data, isLoading, isError, error } = useBatch(params.id);

  if (isLoading) return <Skeleton className="h-96 w-full" role="status" aria-label="Loading" />;
  if (isError || !data) return <Alert variant="error">{messageOf(error, 'Could not load this batch')}</Alert>;

  const stageOf = (stage: string) => data.entries.find((e) => e.stage === stage);
  const making = stageOf('making');
  const drying = stageOf('drying');
  const firing = stageOf('firing');
  const sorting = stageOf('sorting');
  const siteName = sites.find((s) => s.id === data.batch.siteId)?.name ?? '—';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/production/batches"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden /> All batches
          </Link>
          <h2 className="mt-1 text-base font-semibold text-foreground">
            {data.batch.chamber} · {formatDate(data.batch.batchDate)}
          </h2>
          <p className="text-xs text-muted-foreground">{siteName}</p>
        </div>
        <Badge variant={data.batch.status === 'sorted' ? 'success' : 'muted'}>{data.batch.status}</Badge>
      </div>

      <div className="flex flex-col gap-3">
        {making ? <RecordedStage entry={making} detail={data} /> : canManage && <MakingForm batchId={data.batch.id} />}

        {drying ? (
          <RecordedStage entry={drying} detail={data} />
        ) : (
          making && !firing && canManage && <DryingForm batchId={data.batch.id} />
        )}

        {firing ? (
          <RecordedStage entry={firing} detail={data} />
        ) : (
          // Firing needs making, not drying — drying is only a date marker.
          making && canManage && <FiringForm batchId={data.batch.id} />
        )}

        {sorting ? (
          <RecordedStage entry={sorting} detail={data} />
        ) : (
          firing && canManage && <SortingForm batchId={data.batch.id} />
        )}

        {!canManage && data.entries.length === 0 && <Alert variant="info">Nothing recorded on this batch yet.</Alert>}
      </div>
    </div>
  );
}
