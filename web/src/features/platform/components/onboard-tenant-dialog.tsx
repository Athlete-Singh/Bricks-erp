'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { createTenantSchema, type CreateTenantDto, type CreateTenantInput } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { fieldErrorsOf, messageOf } from '@/features/auth/use-auth';
import { useCreateTenant } from '../hooks';

/**
 * PLT-05 — onboard a tenant in one go. The server runs company + chart +
 * first FY + owner user + membership in one transaction, so there is nothing
 * to clean up on a failure; the dialog just surfaces whichever field the
 * backend named.
 *
 * The FY is left to the server — it defaults to the Indian FY the request
 * falls in (1 April → 31 March). An override field would be dead code until a
 * platform admin wanted to backdate a kiln, and S4 is the right place for
 * that.
 */
export function OnboardTenantDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateTenant();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateTenantInput, unknown, CreateTenantDto>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      companyName: '',
      stateCode: '',
      planName: '',
      ownerName: '',
      ownerMobile: '',
      ownerEmail: '',
      ownerPassword: '',
    },
  });

  useEffect(() => {
    if (!create.error) return;
    for (const [field, message] of Object.entries(fieldErrorsOf(create.error))) {
      setError(field as keyof CreateTenantInput, { type: 'server', message });
    }
  }, [create.error, setError]);

  const generalError = create.isError && Object.keys(fieldErrorsOf(create.error)).length === 0;

  const close = () => {
    reset();
    create.reset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Onboard a tenant"
      description="One step: the company, its first financial year, and its owner user — in one transaction."
    >
      <form
        onSubmit={handleSubmit((dto) => create.mutate(dto, { onSuccess: close }))}
        className="flex flex-col gap-4"
        noValidate
      >
        {generalError && <Alert variant="error">{messageOf(create.error, 'Could not onboard the tenant')}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Company name"
            autoFocus
            autoComplete="organization"
            error={errors.companyName?.message}
            {...register('companyName')}
          />
          <Input
            label="State code (place of supply)"
            maxLength={2}
            inputMode="numeric"
            placeholder="09 for UP"
            error={errors.stateCode?.message}
            {...register('stateCode')}
          />
        </div>

        <Input
          label="Plan name (optional)"
          placeholder="starter / standard / enterprise"
          error={errors.planName?.message}
          {...register('planName')}
        />

        <fieldset className="rounded-md border border-border p-3">
          <legend className="px-1 text-xs font-medium text-muted-foreground">Owner</legend>
          <div className="flex flex-col gap-3">
            <Input label="Full name" autoComplete="name" error={errors.ownerName?.message} {...register('ownerName')} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Mobile"
                inputMode="numeric"
                autoComplete="tel"
                error={errors.ownerMobile?.message}
                {...register('ownerMobile')}
              />
              <Input
                label="Email (optional)"
                type="email"
                autoComplete="email"
                error={errors.ownerEmail?.message}
                {...register('ownerEmail')}
              />
            </div>
            <Input
              label="Temporary password"
              type="password"
              autoComplete="new-password"
              error={errors.ownerPassword?.message}
              {...register('ownerPassword')}
            />
          </div>
        </fieldset>

        <p className="text-xs text-muted-foreground">
          The owner signs in with their mobile or email. The financial year defaults to the current Indian FY (1 April
          to 31 March).
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? <Spinner className="text-primary-foreground" /> : 'Onboard'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
