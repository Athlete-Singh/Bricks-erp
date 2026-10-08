'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { changePasswordSchema, type ChangePasswordDto } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { changePassword } from '../api';
import { fieldErrorsOf, messageOf, useLogout } from '../use-auth';

/**
 * ADM-05. The backend revokes every other session on success, so this signs the
 * user out afterwards rather than leaving them on a session whose siblings are
 * already dead.
 */
export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const logout = useLogout();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordDto>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (dto: ChangePasswordDto) => changePassword(dto),
    onSuccess: () => {
      reset();
      onClose();
      logout.mutate();
    },
  });

  useEffect(() => {
    if (!mutation.error) return;
    for (const [field, message] of Object.entries(fieldErrorsOf(mutation.error))) {
      if (field === 'currentPassword' || field === 'newPassword') {
        setError(field, { type: 'server', message });
      }
    }
  }, [mutation.error, setError]);

  const generalError = mutation.isError && Object.keys(fieldErrorsOf(mutation.error)).length === 0;

  const close = () => {
    reset();
    mutation.reset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Change password"
      description="You will be signed out of every device afterwards."
    >
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="flex flex-col gap-4" noValidate>
        {generalError && <Alert variant="error">{messageOf(mutation.error, 'Could not change the password')}</Alert>}

        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />

        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner className="text-primary-foreground" /> : 'Change password'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
