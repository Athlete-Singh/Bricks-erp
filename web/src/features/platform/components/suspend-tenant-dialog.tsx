'use client';

import { useEffect, useState } from 'react';
import type { TenantSummaryDto } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { messageOf } from '@/features/auth/use-auth';
import { useSuspendTenant } from '../hooks';

/**
 * PLT-06 (web) — confirm with a reason. The reason is optional server-side
 * but strongly encouraged here: it goes on the audit trail, and "because I
 * could" is not a reason worth leaving.
 */
export function SuspendTenantDialog({
  tenant,
  open,
  onClose,
}: {
  tenant: TenantSummaryDto | null;
  open: boolean;
  onClose: () => void;
}) {
  const suspend = useSuspendTenant();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  if (!tenant) return null;

  const close = () => {
    suspend.reset();
    onClose();
  };

  const submit = () => {
    suspend.mutate({ id: tenant.id, dto: { reason: reason.trim() || undefined } }, { onSuccess: close });
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={`Suspend ${tenant.name}?`}
      description="While suspended, this tenant's users are refused at sign-in."
    >
      <div className="flex flex-col gap-4">
        {suspend.isError && <Alert variant="error">{messageOf(suspend.error, 'Could not suspend the tenant')}</Alert>}

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Reason (goes on the audit trail)</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Non-payment, policy breach, owner request…"
            className="min-h-20 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </label>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={suspend.isPending}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={submit} disabled={suspend.isPending}>
            {suspend.isPending ? <Spinner className="text-primary-foreground" /> : 'Suspend'}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
