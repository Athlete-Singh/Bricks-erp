'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import {
  createVoucherSchema,
  formatINR,
  subtractAmounts,
  sumAmounts,
  MANUAL_VOUCHER_TYPES,
  type CreateVoucherDto,
  type CreateVoucherInput,
} from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { fieldErrorsOf, messageOf } from '@/features/auth/use-auth';
import { useCreateVoucher, useLedgers } from '../hooks';

const TYPE_LABELS: Record<string, string> = {
  receipt: 'Receipt — money in',
  payment: 'Payment — money out',
  contra: 'Contra — cash ↔ bank',
  journal: 'Journal — anything else',
};

const emptyLine = { ledgerId: '', debit: '', credit: '', narration: '' };

/**
 * Manual voucher entry (ACC-03).
 *
 * The running Dr/Cr totals are the point: the backend will refuse an unbalanced
 * journal, but an accountant should see the difference while typing rather than
 * after submitting. Totals are computed in integer paise (`sumAmounts`) — float
 * arithmetic would make a voucher that balances on paper refuse to submit.
 */
export function VoucherForm() {
  const router = useRouter();
  const { data: ledgers, isLoading: loadingLedgers } = useLedgers();
  const create = useCreateVoucher();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateVoucherInput, unknown, CreateVoucherDto>({
    resolver: zodResolver(createVoucherSchema),
    defaultValues: {
      voucherType: 'payment',
      voucherDate: new Date().toISOString().slice(0, 10),
      narration: '',
      lines: [{ ...emptyLine }, { ...emptyLine }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const watchedLines = useWatch({ control, name: 'lines' }) ?? [];

  const totalDebit = sumAmounts(watchedLines.map((l) => l?.debit));
  const totalCredit = sumAmounts(watchedLines.map((l) => l?.credit));
  const difference = subtractAmounts(totalDebit, totalCredit);
  const isBalanced = difference === '0.00';
  const hasValue = totalDebit !== '0.00';

  useEffect(() => {
    if (!create.error) return;
    for (const [field, message] of Object.entries(fieldErrorsOf(create.error))) {
      setError(field as keyof CreateVoucherInput, { type: 'server', message });
    }
  }, [create.error, setError]);

  const generalError = create.isError && Object.keys(fieldErrorsOf(create.error)).length === 0;
  const activeLedgers = (ledgers ?? []).filter((l) => l.isActive);

  return (
    <form
      onSubmit={handleSubmit((dto) =>
        create.mutate(dto, { onSuccess: (result) => router.push(`/accounts/day-book?highlight=${result.voucher.id}`) }),
      )}
      className="flex flex-col gap-5"
      noValidate
    >
      {generalError && <Alert variant="error">{messageOf(create.error, 'Could not post the voucher')}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Select label="Voucher type" error={errors.voucherType?.message} {...register('voucherType')}>
          {MANUAL_VOUCHER_TYPES.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type] ?? type}
            </option>
          ))}
        </Select>
        <Input label="Date" type="date" error={errors.voucherDate?.message} {...register('voucherDate')} />
        <Input label="Narration" placeholder="What is this for?" {...register('narration')} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Entries</h2>
          <Button type="button" size="sm" variant="outline" onClick={() => append({ ...emptyLine })}>
            <Plus className="h-4 w-4" aria-hidden />
            Add line
          </Button>
        </div>

        {errors.lines?.message && <Alert variant="error">{errors.lines.message}</Alert>}

        <div className="flex flex-col gap-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end sm:gap-2"
            >
              <Select
                label={index === 0 ? 'Ledger' : undefined}
                aria-label="Ledger"
                disabled={loadingLedgers}
                error={errors.lines?.[index]?.ledgerId?.message}
                {...register(`lines.${index}.ledgerId`)}
              >
                <option value="">Select a ledger…</option>
                {activeLedgers.map((ledger) => (
                  <option key={ledger.id} value={ledger.id}>
                    {ledger.name}
                  </option>
                ))}
              </Select>

              <Input
                label={index === 0 ? 'Debit' : undefined}
                aria-label="Debit"
                inputMode="decimal"
                placeholder="0.00"
                className="text-right"
                error={errors.lines?.[index]?.debit?.message}
                {...register(`lines.${index}.debit`)}
              />

              <Input
                label={index === 0 ? 'Credit' : undefined}
                aria-label="Credit"
                inputMode="decimal"
                placeholder="0.00"
                className="text-right"
                {...register(`lines.${index}.credit`)}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove line ${index + 1}`}
                // A journal needs two sides; never let the form drop below that.
                disabled={fields.length <= 2}
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* The running total — the whole reason this is a custom form. */}
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-muted p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total debit</span>
          <span className="font-medium tabular-nums">{formatINR(totalDebit)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total credit</span>
          <span className="font-medium tabular-nums">{formatINR(totalCredit)}</span>
        </div>

        {!isBalanced && hasValue && (
          <div className="flex items-center justify-between border-t border-border pt-2 text-sm text-danger">
            <span>Out of balance by</span>
            <span className="font-semibold tabular-nums">{formatINR(difference.replace('-', ''))}</span>
          </div>
        )}
        {isBalanced && hasValue && (
          <div className="flex items-center justify-between border-t border-border pt-2 text-sm text-success">
            <span>Balanced</span>
            <span className="font-semibold tabular-nums">{formatINR(totalDebit)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={create.isPending || !isBalanced || !hasValue}>
          {create.isPending ? <Spinner className="text-primary-foreground" /> : 'Post voucher'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={create.isPending}>
          Cancel
        </Button>
        {!hasValue && <span className="text-xs text-muted-foreground">Enter an amount to post</span>}
        {hasValue && !isBalanced && (
          <span className="text-xs text-muted-foreground">Debits must equal credits before posting</span>
        )}
      </div>
    </form>
  );
}
