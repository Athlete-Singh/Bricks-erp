'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { createFinancialYearSchema, type CreateFinancialYearDto } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { fieldErrorsOf, messageOf } from '@/features/auth/use-auth';
import { useCreateFinancialYear } from '../hooks';

/** Indian FY runs April–March, so default to the one starting this April. */
function defaultFinancialYear() {
  const today = new Date();
  const startYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  return {
    name: `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`,
    startDate: `${startYear}-04-01`,
    endDate: `${startYear + 1}-03-31`,
  };
}

export function CreateFinancialYearDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateFinancialYear();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateFinancialYearDto>({
    resolver: zodResolver(createFinancialYearSchema),
    defaultValues: defaultFinancialYear(),
  });

  useEffect(() => {
    if (!create.error) return;
    for (const [field, message] of Object.entries(fieldErrorsOf(create.error))) {
      setError(field as keyof CreateFinancialYearDto, { type: 'server', message });
    }
  }, [create.error, setError]);

  const generalError = create.isError && Object.keys(fieldErrorsOf(create.error)).length === 0;

  const close = () => {
    reset(defaultFinancialYear());
    create.reset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Add a financial year"
      description="April to March by default. Periods may not overlap."
    >
      <form
        onSubmit={handleSubmit((dto) => create.mutate(dto, { onSuccess: close }))}
        className="flex flex-col gap-4"
        noValidate
      >
        {generalError && (
          <Alert variant="error">{messageOf(create.error, 'Could not create the financial year')}</Alert>
        )}

        <Input label="Label" placeholder="2026-27" autoFocus error={errors.name?.message} {...register('name')} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Start date" type="date" error={errors.startDate?.message} {...register('startDate')} />
          <Input label="End date" type="date" error={errors.endDate?.message} {...register('endDate')} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? <Spinner className="text-primary-foreground" /> : 'Add financial year'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
