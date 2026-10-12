'use client';

import { useEffect, useState } from 'react';
import { DeductionCategory, todayISO } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { fieldErrorsOf, messageOf, useSession } from '@/features/auth/use-auth';
import { useParties } from '@/features/masters/hooks';
import { useCreateDeduction, useWorkers } from '@/features/labour/hooks';

export interface DeductionDialogProps {
  open: boolean;
  onClose: () => void;
  defaultSardarId?: string;
}

const CATEGORY_OPTIONS: { value: DeductionCategory; label: string }[] = [
  { value: DeductionCategory.KHURAK, label: 'Khurak (Food / Ration)' },
  { value: DeductionCategory.ADVANCE_RECOVERY, label: 'Advance Recovery' },
  { value: DeductionCategory.LOAN_INSTALMENT, label: 'Loan Instalment' },
  { value: DeductionCategory.FINE, label: 'Fine / Penalty' },
];

export function DeductionDialog({ open, onClose, defaultSardarId }: DeductionDialogProps) {
  const { sites, activeSiteId } = useSession();
  const [siteId, setSiteId] = useState(activeSiteId || sites[0]?.id || '');
  const [sardarPartyId, setSardarPartyId] = useState(defaultSardarId ?? '');
  const [workerId, setWorkerId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<DeductionCategory>(DeductionCategory.KHURAK);
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');

  const { data: sardars } = useParties({ type: 'sardar', limit: 100 });
  const { data: workers } = useWorkers();

  const mutation = useCreateDeduction();
  const serverFieldErrors = fieldErrorsOf(mutation.error);
  const generalError = mutation.isError && Object.keys(serverFieldErrors).length === 0;

  useEffect(() => {
    if (defaultSardarId) {
      setSardarPartyId(defaultSardarId);
    }
  }, [defaultSardarId]);

  useEffect(() => {
    if (activeSiteId && !siteId) {
      setSiteId(activeSiteId);
    } else if (sites[0]?.id && !siteId) {
      setSiteId(sites[0].id);
    }
  }, [activeSiteId, sites, siteId]);

  const close = () => {
    mutation.reset();
    setSardarPartyId(defaultSardarId ?? '');
    setWorkerId('');
    setDate(todayISO());
    setCategory(DeductionCategory.KHURAK);
    setAmount('');
    setRemarks('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !sardarPartyId || !date || !amount || !category) return;

    mutation.mutate(
      {
        siteId,
        sardarPartyId,
        workerId: workerId ? workerId : null,
        date,
        category,
        amount,
        remarks: remarks.trim() ? remarks.trim() : null,
      },
      {
        onSuccess: close,
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Record Deduction (LAB-06)"
      description="Record wage deductions for Khurak (food/mess), loan repayments, or penalties."
    >
      <form id="deduction-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {generalError && <Alert variant="error">{messageOf(mutation.error, 'Could not record deduction')}</Alert>}

        <fieldset disabled={mutation.isPending} className="flex flex-col gap-4 border-0 p-0">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              id="ded-site"
              label="Kiln / Site *"
              value={siteId}
              required
              error={serverFieldErrors.siteId}
              onChange={(e) => setSiteId(e.target.value)}
            >
              <option value="">Select kiln…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>

            <Select
              id="ded-sardar"
              label="Sardar *"
              value={sardarPartyId}
              required
              error={serverFieldErrors.sardarPartyId}
              onChange={(e) => {
                setSardarPartyId(e.target.value);
                setWorkerId('');
              }}
            >
              <option value="">Select Sardar…</option>
              {sardars?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              id="ded-worker"
              label="Worker (Optional)"
              value={workerId}
              error={serverFieldErrors.workerId}
              onChange={(e) => setWorkerId(e.target.value)}
            >
              <option value="">Entire gang / Sardar only</option>
              {workers?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.labourGroup ? `(${w.labourGroup.name})` : ''}
                </option>
              ))}
            </Select>

            <Input
              id="ded-date"
              label="Date *"
              type="date"
              required
              value={date}
              error={serverFieldErrors.date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              id="ded-category"
              label="Category *"
              value={category}
              required
              error={serverFieldErrors.category}
              onChange={(e) => setCategory(e.target.value as DeductionCategory)}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>

            <Input
              id="ded-amount"
              label="Amount (₹) *"
              inputMode="decimal"
              placeholder="1000.00"
              required
              value={amount}
              error={serverFieldErrors.amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <Input
            id="ded-remarks"
            label="Remarks"
            placeholder="Deduction reason, mess details, etc."
            value={remarks}
            error={serverFieldErrors.remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </fieldset>

        <DialogFooter>
          <Button variant="ghost" type="button" onClick={close} disabled={mutation.isPending} className="min-h-[44px]">
            Cancel
          </Button>
          <Button
            type="submit"
            form="deduction-form"
            disabled={mutation.isPending || !sardarPartyId || !amount}
            className="min-h-[44px]"
          >
            {mutation.isPending ? 'Recording deduction…' : 'Record Deduction'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
