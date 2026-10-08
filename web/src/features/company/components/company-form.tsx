'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { updateCompanySchema, type UpdateCompanyDto, type UpdateCompanyInput } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { fieldErrorsOf, messageOf } from '@/features/auth/use-auth';
import type { Company } from '../api';
import { useUpdateCompany } from '../hooks';

/** ADM-01. Read-only unless the user holds `company.manage`. */
export function CompanyForm({ company, canEdit }: { company: Company; canEdit: boolean }) {
  const update = useUpdateCompany();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
    // Input vs output: blank optional fields normalise to null on submit.
  } = useForm<UpdateCompanyInput, unknown, UpdateCompanyDto>({
    resolver: zodResolver(updateCompanySchema),
    values: {
      name: company.name,
      gstin: company.gstin,
      pan: company.pan,
      stateCode: company.stateCode,
      address: company.address,
      logoUrl: company.logoUrl,
    },
  });

  useEffect(() => {
    if (!update.error) return;
    for (const [field, message] of Object.entries(fieldErrorsOf(update.error))) {
      setError(field as keyof UpdateCompanyInput, { type: 'server', message });
    }
  }, [update.error, setError]);

  const generalError = update.isError && Object.keys(fieldErrorsOf(update.error)).length === 0;

  return (
    <form
      onSubmit={handleSubmit((dto) => update.mutate({ id: company.id, dto }, { onSuccess: () => reset(dto) }))}
      className="flex max-w-2xl flex-col gap-4"
      noValidate
    >
      {generalError && <Alert variant="error">{messageOf(update.error, 'Could not save the company')}</Alert>}
      {update.isSuccess && !isDirty && <Alert variant="success">Company details saved.</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Company name" disabled={!canEdit} error={errors.name?.message} {...register('name')} />
        <Input
          label="State code (place of supply)"
          disabled={!canEdit}
          maxLength={2}
          inputMode="numeric"
          error={errors.stateCode?.message}
          {...register('stateCode')}
        />
        <Input
          label="GSTIN"
          disabled={!canEdit}
          maxLength={15}
          placeholder="15 characters"
          error={errors.gstin?.message}
          {...register('gstin')}
        />
        <Input
          label="PAN"
          disabled={!canEdit}
          maxLength={10}
          placeholder="10 characters"
          error={errors.pan?.message}
          {...register('pan')}
        />
      </div>

      <Input label="Address" disabled={!canEdit} error={errors.address?.message} {...register('address')} />
      <Input
        label="Logo URL"
        type="url"
        disabled={!canEdit}
        placeholder="https://…"
        error={errors.logoUrl?.message}
        {...register('logoUrl')}
      />

      {canEdit && (
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={update.isPending || !isDirty}>
            {update.isPending ? <Spinner className="text-primary-foreground" /> : 'Save changes'}
          </Button>
          {isDirty && (
            <Button type="button" variant="ghost" onClick={() => reset()} disabled={update.isPending}>
              Discard
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
