'use client';

import { MessageSquare, Send } from 'lucide-react';
import { useState } from 'react';
import { formatDate, PERMISSIONS, type NotificationDto } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { useNotifications, useSendPending } from '../hooks';

const EVENT_LABEL: Record<NotificationDto['event'], string> = {
  dispatch_sent: 'Load dispatched',
  payment_received: 'Payment received',
  advance_alert: 'Advance over the limit',
};

const STATUS: Record<
  NotificationDto['status'],
  { label: string; variant: 'success' | 'warning' | 'danger' | 'muted' }
> = {
  sent: { label: 'Sent', variant: 'success' },
  logged: { label: 'Logged, not sent', variant: 'muted' },
  queued: { label: 'Waiting', variant: 'warning' },
  failed: { label: 'Failed', variant: 'danger' },
};

/** "+91 98765 43210" — the way the number is read aloud. */
const showPhone = (p: string) => (p.length === 12 ? `+${p.slice(0, 2)} ${p.slice(2, 7)} ${p.slice(7)}` : p);

/** NTF-01 — every alert written, and what happened to it. */
export function AlertLog() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications({ page, limit: 25 });
  const send = useSendPending();
  const { can } = useSession();
  const total = data?.meta.total ?? 0;

  const columns: Column<NotificationDto>[] = [
    {
      key: 'when',
      header: 'When',
      render: (n) => <span className="whitespace-nowrap">{formatDate(n.createdAt.slice(0, 10))}</span>,
    },
    { key: 'event', header: 'Alert', render: (n) => EVENT_LABEL[n.event] },
    { key: 'to', header: 'To', render: (n) => <span className="tabular-nums">{showPhone(n.toPhone)}</span> },
    {
      key: 'message',
      header: 'Message',
      hideOnMobile: true,
      render: (n) => (
        <span className="block max-w-md text-muted-foreground">
          {n.body}
          {n.error && <span className="mt-1 block text-danger">{n.error}</span>}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (n) => <Badge variant={STATUS[n.status].variant}>{STATUS[n.status].label}</Badge>,
    },
  ];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Messages</h2>
        {can(PERMISSIONS.COMPANY_MANAGE) && (
          <Button size="sm" variant="outline" onClick={() => send.mutate()} disabled={send.isPending}>
            {send.isPending ? <Spinner className="h-3 w-3" /> : <Send className="h-4 w-4" aria-hidden />}
            Send waiting now
          </Button>
        )}
      </div>
      {send.isError && <Alert variant="error">{messageOf(send.error, 'Could not send')}</Alert>}
      <DataTable
        caption="SMS alerts"
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(n) => n.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={MessageSquare}
            title="No alerts yet"
            description="Turn an alert on above; the next challan, receipt or advance writes one here."
          />
        }
      />
      {total > 25 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page} of {Math.ceil(total / 25)}
          </span>
          <Button size="sm" variant="outline" disabled={page * 25 >= total} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </section>
  );
}
