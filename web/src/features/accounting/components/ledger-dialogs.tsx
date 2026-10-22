'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  createLedgerSchema,
  updateLedgerSchema,
  type CreateLedgerDto,
  type CreateLedgerInput,
  type UpdateLedgerDto,
} from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { fieldErrorsOf, messageOf } from '@/features/auth/use-auth';
import type { Ledger, LedgerGroup } from '../api';
import { useCreateLedger, useUpdateLedger } from '../hooks';

/** The seeded group a bank account belongs under (CHART_OF_ACCOUNTS in `@brics/shared`). */
export const BANK_GROUP_CODE = 'BANK_ACCOUNTS';

/**
 * Groups as a flat list a person can pick from: each top-level group
 * followed by its children, the children marked with a dash.
 */
export function groupOptions(groups: LedgerGroup[]): { id: string; label: string }[] {
  const byName = (a: LedgerGroup, b: LedgerGroup) => a.name.localeCompare(b.name);
  const tops = groups.filter((g) => !g.parentId).sort(byName);
  return tops.flatMap((top) => [
    { id: top.id, label: top.name },
    ...groups
      .filter((g) => g.parentId === top.id)
      .sort(byName)
      .map((child) => ({ id: child.id, label: `— ${child.name}` })),
  ]);
}

/**
 * ACC-01 / ADM-08 — add a ledger. With `bank`, the group is fixed to Bank
 * Accounts: the owner adds their bank in one step, and receipts, payments and
 * expenses can then be paid from it.
 */
export function CreateLedgerDialog({
  open,
  onClose,
  groups,
  bank = false,
}: {
  open: boolean;
  onClose: () => void;
  groups: LedgerGroup[];
  bank?: boolean;
}) {
  const create = useCreateLedger();
  const bankGroup = groups.find((g) => g.code === BANK_GROUP_CODE);
  const options = useMemo(() => groupOptions(groups), [groups]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateLedgerInput, unknown, CreateLedgerDto>({
    resolver: zodResolver(createLedgerSchema),
    defaultValues: { name: '', groupId: '', code: '' },
  });

  // The bank group arrives with the groups query; fix it as soon as it does.
  useEffect(() => {
    if (open && bank && bankGroup) setValue('groupId', bankGroup.id);
  }, [open, bank, bankGroup, setValue]);

  useEffect(() => {
    if (!create.error) return;
    for (const [field, message] of Object.entries(fieldErrorsOf(create.error))) {
      setError(field as keyof CreateLedgerInput, { type: 'server', message });
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
      title={bank ? 'Add a bank account' : 'New ledger'}
      description={
        bank
          ? 'It appears under Bank Accounts. Receipts, payments and expenses can then be paid from it; its opening balance is set in Settings → Go-live import.'
          : 'A ledger is one account in the books, under one group of the chart of accounts.'
      }
    >
      <form
        onSubmit={handleSubmit((dto) => create.mutate(dto, { onSuccess: close }))}
        className="flex flex-col gap-4"
        noValidate
      >
        {generalError && <Alert variant="error">{messageOf(create.error, 'Could not add the ledger')}</Alert>}

        <Input
          label={bank ? 'Bank and account' : 'Ledger name'}
          placeholder={bank ? 'HDFC Bank — Current A/c 1234' : undefined}
          autoFocus
          error={errors.name?.message}
          {...register('name')}
        />

        {bank ? (
          <input type="hidden" {...register('groupId')} />
        ) : (
          <Select label="Group" error={errors.groupId?.message} {...register('groupId')}>
            <option value="">Pick a group…</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        )}

        <Input
          label="Code (optional)"
          placeholder={bank ? 'HDFC_CA' : undefined}
          error={errors.code?.message}
          {...register('code')}
        />

        {bank && !bankGroup && (
          <Alert variant="error">
            This company has no Bank Accounts group — the chart of accounts needs reseeding.
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending || (bank && !bankGroup)}>
            {create.isPending ? (
              <Spinner className="text-primary-foreground" />
            ) : bank ? (
              'Add bank account'
            ) : (
              'Add ledger'
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

interface EditForm {
  name: string;
  groupId: string;
  isActive: boolean;
}

/**
 * ACC-01 — rename, regroup or retire a ledger. A built-in ledger can only be
 * renamed: the posting rules depend on its group, and the books on it existing
 * (the server says the same — LEDGER_SYSTEM_GROUP_FIXED / LEDGER_SYSTEM_REQUIRED).
 */
export function EditLedgerDialog({
  ledger,
  onClose,
  groups,
}: {
  ledger: Ledger | null;
  onClose: () => void;
  groups: LedgerGroup[];
}) {
  const update = useUpdateLedger();
  const options = useMemo(() => groupOptions(groups), [groups]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<EditForm>({ defaultValues: { name: '', groupId: '', isActive: true } });

  useEffect(() => {
    if (ledger) reset({ name: ledger.name, groupId: ledger.groupId, isActive: ledger.isActive });
  }, [ledger, reset]);

  useEffect(() => {
    if (!update.error) return;
    for (const [field, message] of Object.entries(fieldErrorsOf(update.error))) {
      setError(field as keyof EditForm, { type: 'server', message });
    }
  }, [update.error, setError]);

  const generalError = update.isError && Object.keys(fieldErrorsOf(update.error)).length === 0;

  const close = () => {
    update.reset();
    onClose();
  };

  const submit = (form: EditForm) => {
    if (!ledger) return;
    // Send only what changed, and never a group or status change for a built-in ledger.
    const dto: UpdateLedgerDto = {};
    if (form.name.trim() !== ledger.name) dto.name = form.name.trim();
    if (!ledger.isSystem && form.groupId !== ledger.groupId) dto.groupId = form.groupId;
    if (!ledger.isSystem && form.isActive !== ledger.isActive) dto.isActive = form.isActive;
    const parsed = updateLedgerSchema.safeParse(dto);
    if (!parsed.success) {
      setError('name', { type: 'validate', message: 'Ledger name must be at least 2 characters' });
      return;
    }
    update.mutate({ id: ledger.id, dto: parsed.data }, { onSuccess: close });
  };

  return (
    <Dialog
      open={ledger !== null}
      onClose={close}
      title="Edit ledger"
      description={ledger?.isSystem ? 'A built-in ledger can be renamed, not moved or retired.' : undefined}
    >
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
        {generalError && <Alert variant="error">{messageOf(update.error, 'Could not save the ledger')}</Alert>}

        <Input
          label="Ledger name"
          error={errors.name?.message}
          {...register('name', { required: 'Ledger name is required' })}
        />

        <Select label="Group" disabled={ledger?.isSystem} error={errors.groupId?.message} {...register('groupId')}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>

        {!ledger?.isSystem && (
          <label className="flex min-h-[2.25rem] cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
              {...register('isActive')}
            />
            <span>Active — an inactive ledger cannot be used on new vouchers</span>
          </label>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={update.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={update.isPending || !isDirty}>
            {update.isPending ? <Spinner className="text-primary-foreground" /> : 'Save changes'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
