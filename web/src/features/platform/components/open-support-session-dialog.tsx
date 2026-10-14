'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { createSupportSessionSchema, type TenantSummaryDto } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { fieldErrorsOf, messageOf } from '@/features/auth/use-auth';
import { getAccessToken, getRefreshToken } from '@/lib/auth-token';
import { cn } from '@/lib/cn';
import { backupPlatformTokens } from '@/lib/support-token-store';
import { useAuthStore } from '@/stores/auth-store';
import { useOpenSupportSession } from '../hooks';

export interface OpenSupportSessionDialogProps {
  tenant: TenantSummaryDto | null;
  open: boolean;
  onClose: () => void;
}

const formSchema = createSupportSessionSchema.pick({ reason: true, approvalCode: true });
type FormValues = { reason: string; approvalCode?: string };

/**
 * OpenSupportSessionDialog (PLT-07 / PLT-10)
 *
 * Allows a platform operator to open a time-limited (2h) support session for
 * a tenant. Backs up the operator's platform tokens into sessionStorage,
 * adopts the scoped support session token, and navigates to the tenant dashboard.
 *
 * If tenant.requireSupportApproval is enabled, checks for an active pre-approved
 * window; if none is active, requires a 6-digit approval code from the owner.
 */
export function OpenSupportSessionDialog({ tenant, open, onClose }: OpenSupportSessionDialogProps) {
  const router = useRouter();
  const openSession = useOpenSupportSession();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { reason: '', approvalCode: '' },
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    if (!openSession.error) return;
    const fieldErrors = fieldErrorsOf(openSession.error);
    if (fieldErrors.reason) {
      setError('reason', { type: 'server', message: fieldErrors.reason });
    }
    if (fieldErrors.approvalCode) {
      setError('approvalCode', { type: 'server', message: fieldErrors.approvalCode });
    }
  }, [openSession.error, setError]);

  if (!tenant) return null;

  const hasPreApprovedAccess = Boolean(
    tenant.supportAccessGrantedUntil && new Date(tenant.supportAccessGrantedUntil).getTime() > Date.now(),
  );

  const generalError =
    openSession.isError && !fieldErrorsOf(openSession.error).reason && !fieldErrorsOf(openSession.error).approvalCode;

  const close = () => {
    reset();
    openSession.reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    if (
      tenant.requireSupportApproval &&
      !hasPreApprovedAccess &&
      (!values.approvalCode || !values.approvalCode.trim())
    ) {
      setError('approvalCode', { type: 'manual', message: 'Approval code is required for this tenant' });
      return;
    }

    try {
      const res = await openSession.mutateAsync({
        tenantId: tenant.id,
        reason: values.reason.trim(),
        approvalCode: values.approvalCode?.trim() || undefined,
      });
      const currentTokens = {
        accessToken: getAccessToken() ?? '',
        refreshToken: getRefreshToken() ?? '',
      };
      backupPlatformTokens(currentTokens);
      useAuthStore.getState().setSession(res.auth);
      close();
      router.push('/dashboard');
    } catch {
      // openSession.error is captured by React Query and rendered via messageOf/fieldErrorsOf
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={`Open support session — ${tenant.name}`}
      description="Acquire temporary 2-hour access to this tenant's books. All actions will be logged under your platform identity."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {generalError && (
          <Alert variant="error">{messageOf(openSession.error, 'Could not open support session')}</Alert>
        )}

        {tenant.requireSupportApproval &&
          (hasPreApprovedAccess ? (
            <Alert variant="info">
              Tenant owner has pre-approved temporary support access until{' '}
              {new Date(tenant.supportAccessGrantedUntil!).toLocaleString()}.
            </Alert>
          ) : (
            <Alert variant="warning">
              This tenant requires explicit support approval. Ask the tenant owner for a 6-digit approval code from
              Company Settings.
            </Alert>
          ))}

        <div className="flex flex-col gap-1">
          <label htmlFor="support-session-reason" className="text-xs font-medium text-muted-foreground">
            Reason (goes on the audit trail)
          </label>
          <textarea
            id="support-session-reason"
            rows={3}
            maxLength={500}
            placeholder="Say why you need access (e.g. ticket #1234, investigating payroll posting)..."
            aria-label="Reason"
            aria-invalid={Boolean(errors.reason)}
            className={cn(
              'min-h-20 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
              errors.reason && 'border-red-500 focus-visible:ring-red-500',
            )}
            {...register('reason')}
          />
          {errors.reason && <p className="text-xs text-red-500">{errors.reason.message}</p>}
        </div>

        {tenant.requireSupportApproval && (
          <Input
            id="support-session-approval-code"
            label={hasPreApprovedAccess ? 'Approval code (optional — pre-approval active)' : 'Approval code'}
            placeholder="e.g. 123456"
            maxLength={32}
            error={errors.approvalCode?.message}
            {...register('approvalCode')}
          />
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={openSession.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={openSession.isPending}>
            {openSession.isPending ? <Spinner className="text-primary-foreground" /> : 'Open session'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
