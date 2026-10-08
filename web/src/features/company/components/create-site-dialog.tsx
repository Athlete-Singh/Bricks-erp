'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { createSiteSchema, SITE_TYPES, type CreateSiteDto, type CreateSiteInput } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { fieldErrorsOf, messageOf } from '@/features/auth/use-auth';
import { useCreateSite } from '../hooks';

/** ADM-03. The company is taken from the JWT, so it is never a field here. */
export function CreateSiteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateSite();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
    // Input vs output: `type` has a schema default, so the form may hold it unset
    // while the submitted value never is.
  } = useForm<CreateSiteInput, unknown, CreateSiteDto>({
    resolver: zodResolver(createSiteSchema),
    defaultValues: { name: '', code: '', type: 'kiln', address: '' },
  });

  useEffect(() => {
    if (!create.error) return;
    for (const [field, message] of Object.entries(fieldErrorsOf(create.error))) {
      setError(field as keyof CreateSiteInput, { type: 'server', message });
    }
  }, [create.error, setError]);

  const generalError = create.isError && Object.keys(fieldErrorsOf(create.error)).length === 0;

  const close = () => {
    reset();
    create.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title="Add a kiln or site" description="Kilns, branches and depots live here.">
      <form
        onSubmit={handleSubmit((dto) => create.mutate(dto, { onSuccess: close }))}
        className="flex flex-col gap-4"
        noValidate
      >
        {generalError && <Alert variant="error">{messageOf(create.error, 'Could not create the kiln')}</Alert>}

        <Input label="Name" autoFocus error={errors.name?.message} {...register('name')} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Code" placeholder="K1" error={errors.code?.message} {...register('code')} />
          <Select label="Type" error={errors.type?.message} {...register('type')}>
            {SITE_TYPES.map((type) => (
              <option key={type} value={type} className="capitalize">
                {type}
              </option>
            ))}
          </Select>
        </div>

        <Input label="Address" error={errors.address?.message} {...register('address')} />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? <Spinner className="text-primary-foreground" /> : 'Add kiln'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
