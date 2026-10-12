'use client';

import { useEffect, useState } from 'react';
import { formatINR, todayISO } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { fieldErrorsOf, messageOf, useSession } from '@/features/auth/use-auth';
import { useParties } from '@/features/masters/hooks';
import type { AccrueWagesResult } from '@/features/labour/api';
import { useAccrueWages } from '@/features/labour/hooks';

export interface AccrueWagesDialogProps {
  open: boolean;
  onClose: () => void;
  defaultSardarId?: string;
}

export function AccrueWagesDialog({ open, onClose, defaultSardarId }: AccrueWagesDialogProps) {
  const { sites, activeSiteId } = useSession();
  const [siteId, setSiteId] = useState(activeSiteId || sites[0]?.id || '');
  const [sardarPartyId, setSardarPartyId] = useState(defaultSardarId ?? '');
  const [date, setDate] = useState(todayISO());
  const [periodFrom, setPeriodFrom] = useState(() => {
    // Default to first day of current calendar month
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [periodTo, setPeriodTo] = useState(todayISO());
  const [remarks, setRemarks] = useState('');
  const [accruedResult, setAccruedResult] = useState<AccrueWagesResult | null>(null);

  const { data: sardars } = useParties({ type: 'sardar', limit: 100 });

  const mutation = useAccrueWages();
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
    setDate(todayISO());
    setRemarks('');
    setAccruedResult(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !sardarPartyId || !date || !periodFrom || !periodTo) return;

    mutation.mutate(
      {
        siteId,
        sardarPartyId,
        date,
        periodFrom,
        periodTo,
        remarks: remarks.trim() ? remarks.trim() : null,
      },
      {
        onSuccess: (result) => {
          setAccruedResult(result);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Accrue Wages (LAB-04)"
      description="Post period wage accrual journals from piece-rate production and daily attendance."
    >
      {accruedResult ? (
        <div className="flex flex-col gap-4">
          <Alert variant="success">
            <p className="font-semibold">Wage Accrual Journal Posted!</p>
            <p className="mt-1 text-xs">
              Voucher #{accruedResult.voucherNumber} has been created in the general ledger.
            </p>
            <p className="mt-1 text-xs font-medium">Gross wages accrued: {formatINR(accruedResult.grossWages)}</p>
            {accruedResult.narration && (
              <p className="mt-1 text-xs text-muted-foreground italic">{accruedResult.narration}</p>
            )}
          </Alert>

          <DialogFooter>
            <Button type="button" onClick={close} className="min-h-[44px]">
              Done
            </Button>
          </DialogFooter>
        </div>
      ) : (
        <form id="accrue-wages-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {generalError && <Alert variant="error">{messageOf(mutation.error, 'Could not accrue wages')}</Alert>}

          <fieldset disabled={mutation.isPending} className="flex flex-col gap-4 border-0 p-0">
            {/* LAB-04 Journal Helper Explanation */}
            <div className="rounded-md border border-border bg-surface-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">LAB-04 Journal Rule:</strong> Posting this automatically records a
              balanced journal voucher debiting{' '}
              <span className="font-mono text-foreground font-semibold">LABOUR_WAGES</span> (Expense) and crediting{' '}
              <span className="font-mono text-foreground font-semibold">Sardar Party Ledger</span> (Payable Liability).
              Net settlement payout is deferred until final settlement (LAB-07).
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                id="accrue-site"
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
                id="accrue-sardar"
                label="Sardar *"
                value={sardarPartyId}
                required
                error={serverFieldErrors.sardarPartyId}
                onChange={(e) => setSardarPartyId(e.target.value)}
              >
                <option value="">Select Sardar…</option>
                {sardars?.items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <Input
              id="accrue-date"
              label="Journal Voucher Date *"
              type="date"
              required
              value={date}
              error={serverFieldErrors.date}
              onChange={(e) => setDate(e.target.value)}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                id="accrue-from"
                label="Period From *"
                type="date"
                required
                value={periodFrom}
                error={serverFieldErrors.periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
              />

              <Input
                id="accrue-to"
                label="Period To *"
                type="date"
                required
                value={periodTo}
                error={serverFieldErrors.periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
              />
            </div>

            <Input
              id="accrue-remarks"
              label="Remarks / Narration"
              placeholder="e.g. Fortnight wage accrual for making and loading"
              value={remarks}
              error={serverFieldErrors.remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </fieldset>

          <DialogFooter>
            <Button
              variant="ghost"
              type="button"
              onClick={close}
              disabled={mutation.isPending}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="accrue-wages-form"
              disabled={mutation.isPending || !siteId || !sardarPartyId}
              className="min-h-[44px]"
            >
              {mutation.isPending ? 'Posting journal…' : 'Accrue Wages (LAB-04)'}
            </Button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}
