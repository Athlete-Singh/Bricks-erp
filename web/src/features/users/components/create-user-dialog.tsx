'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { createUserSchema, type CreateUserDto, type CreateUserInput } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { fieldErrorsOf, messageOf } from '@/features/auth/use-auth';
import { humanizeRole, useCreateUser, useRoles } from '../hooks';
import { KilnAccessField } from './kiln-access-field';

/** ADM-06. The company comes from the JWT, so it is never a field here. */
export function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateUser();
  const { data: roles } = useRoles();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
    // `siteIds` has a schema default, so the form's input type differs from the
    // value that is submitted.
  } = useForm<CreateUserInput, unknown, CreateUserDto>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: '', mobile: '', email: '', password: '', roleCode: 'supervisor', siteIds: [] },
  });

  useEffect(() => {
    if (!create.error) return;
    for (const [field, message] of Object.entries(fieldErrorsOf(create.error))) {
      setError(field as keyof CreateUserInput, { type: 'server', message });
    }
  }, [create.error, setError]);

  const generalError = create.isError && Object.keys(fieldErrorsOf(create.error)).length === 0;

  const close = () => {
    reset();
    create.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title="Add a user" description="They sign in with their mobile or email.">
      <form
        onSubmit={handleSubmit((dto) => create.mutate(dto, { onSuccess: close }))}
        className="flex flex-col gap-4"
        noValidate
      >
        {generalError && <Alert variant="error">{messageOf(create.error, 'Could not create the user')}</Alert>}

        <Input label="Full name" autoFocus error={errors.name?.message} {...register('name')} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Mobile"
            inputMode="numeric"
            autoComplete="off"
            error={errors.mobile?.message}
            {...register('mobile')}
          />
          <Input
            label="Email (optional)"
            type="email"
            autoComplete="off"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Role" error={errors.roleCode?.message} {...register('roleCode')}>
            {roles?.map((role) => (
              <option key={role.id} value={role.code}>
                {role.name}
              </option>
            )) ?? <option value="supervisor">{humanizeRole('supervisor')}</option>}
          </Select>
          <Input
            label="Temporary password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <Controller
          control={control}
          name="siteIds"
          render={({ field }) => <KilnAccessField value={field.value ?? []} onChange={field.onChange} />}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? <Spinner className="text-primary-foreground" /> : 'Add user'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
