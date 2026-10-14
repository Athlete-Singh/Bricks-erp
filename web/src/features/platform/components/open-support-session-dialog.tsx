'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { createSupportSessionSchema, type TenantSummaryDto } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
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

const formSchema = createSupportSessionSchema.pick({ reason: true });
type FormValues = { reason: string };

/**
 * OpenSupportSessionDialog (PLT-07)
 *
 * Allows a platform operator to open a time-limited (2h) support session for
 * a tenant. Backs up the operator's platform tokens into sessionStorage,
 * adopts the scoped support session token, and navigates to the tenant dashboard.
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
    defaultValues: { reason: '' },
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
  }, [openSession.error, setError]);

  if (!tenant) return null;

  const generalError = openSession.isError && !fieldErrorsOf(openSession.error).reason;

  const close = () => {
    reset();
    openSession.reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await openSession.mutateAsync({
        tenantId: tenant.id,
        reason: values.reason.trim(),
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
