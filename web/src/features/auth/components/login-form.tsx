'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { loginSchema, type LoginDto } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { fieldErrorsOf, messageOf, useLogin } from '../use-auth';

export function LoginForm() {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    defaultValues: { emailOrMobile: '', password: '' },
  });

  // The backend validates the same schema, so a 400 means a rule the client
  // could not check (e.g. an identifier format it rejects). Surface it per field.
  useEffect(() => {
    if (!login.error) return;
    for (const [field, message] of Object.entries(fieldErrorsOf(login.error))) {
      if (field === 'emailOrMobile' || field === 'password') {
        setError(field, { type: 'server', message });
      }
    }
  }, [login.error, setError]);

  const credentialsRejected = login.isError && Object.keys(fieldErrorsOf(login.error)).length === 0;

  return (
    <form onSubmit={handleSubmit((values) => login.mutate(values))} className="flex flex-col gap-4" noValidate>
      {credentialsRejected && <Alert variant="error">{messageOf(login.error, 'Could not sign in')}</Alert>}

      <Input
        label="Email or mobile"
        autoComplete="username"
        autoFocus
        error={errors.emailOrMobile?.message}
        {...register('emailOrMobile')}
      />

      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />

      <Button type="submit" disabled={login.isPending} className="mt-1">
        {login.isPending ? <Spinner className="text-primary-foreground" /> : 'Sign in'}
      </Button>
    </form>
  );
}
