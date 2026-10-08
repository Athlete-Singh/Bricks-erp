'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { updateUserSchema, type UpdateUserDto, type UpdateUserInput } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { fieldErrorsOf, messageOf, useSession } from '@/features/auth/use-auth';
import type { UserRow } from '../api';
import { useRoles, useUpdateUser } from '../hooks';
import { KilnAccessField } from './kiln-access-field';

interface EditUserDialogProps {
  user: UserRow | null;
  onClose: () => void;
}

/** ADM-06: change role, kiln access or active state. Passwords are never edited here. */
export function EditUserDialog({ user, onClose }: EditUserDialogProps) {
  const update = useUpdateUser();
  const { data: roles } = useRoles();
  const { user: me } = useSession();

  const isSelf = me?.id === user?.id;

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
    // Input vs output: blank optional fields normalise to null on submit.
  } = useForm<UpdateUserInput, unknown, UpdateUserDto>({
    resolver: zodResolver(updateUserSchema),
    values: {
      name: user?.name ?? '',
      email: user?.email ?? null,
      roleCode: user?.roleCode ?? undefined,
      siteIds: user?.siteIds ?? [],
      isActive: user?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (!update.error) return;
    for (const [field, message] of Object.entries(fieldErrorsOf(update.error))) {
      setError(field as keyof UpdateUserInput, { type: 'server', message });
    }
  }, [update.error, setError]);

  const generalError = update.isError && Object.keys(fieldErrorsOf(update.error)).length === 0;

  const close = () => {
    update.reset();
    onClose();
  };

  return (
    <Dialog open={user !== null} onClose={close} title="Edit user" description={user?.mobile}>
      {user && (
        <form
          onSubmit={handleSubmit((dto) => update.mutate({ id: user.id, dto }, { onSuccess: close }))}
          className="flex flex-col gap-4"
          noValidate
        >
          {generalError && <Alert variant="error">{messageOf(update.error, 'Could not save the user')}</Alert>}

          {isSelf && (
            <Alert variant="warning">
              This is your own account. Changing your role or deactivating it will take effect on your next sign-in.
            </Alert>
          )}

          <Input label="Full name" error={errors.name?.message} {...register('name')} />
          <Input label="Email (optional)" type="email" error={errors.email?.message} {...register('email')} />

          <Select label="Role" error={errors.roleCode?.message} {...register('roleCode')}>
            {roles?.map((role) => (
              <option key={role.id} value={role.code}>
                {role.name}
              </option>
            ))}
          </Select>

          <Controller
            control={control}
            name="siteIds"
            render={({ field }) => <KilnAccessField value={field.value ?? []} onChange={field.onChange} />}
          />

          <label className="flex min-h-[2.25rem] cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
              {...register('isActive')}
            />
            <span>Active — an inactive user cannot sign in</span>
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={update.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending || !isDirty}>
              {update.isPending ? <Spinner className="text-primary-foreground" /> : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}
