'use client';

import { useEffect, useState } from 'react';
import { PAYMENT_MODES, PaymentMode, formatINR, toPaise, todayISO } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useLedgers } from '@/features/accounting/hooks';
import { fieldErrorsOf, messageOf, useSession } from '@/features/auth/use-auth';
import { useParties } from '@/features/masters/hooks';
import { useCreateAdvance, useSardarExposure, useWorkers } from '@/features/labour/hooks';

export interface AdvanceDialogProps {
  open: boolean;
  onClose: () => void;
  defaultSardarId?: string;
  /** Backwards compatibility alias for defaultSardarId */
  initialSardarPartyId?: string;
}

const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  cash: 'Cash',
  bank: 'Bank / Cheque',
  upi: 'UPI',
  credit: 'Credit',
};

export function AdvanceDialog({ open, onClose, defaultSardarId, initialSardarPartyId }: AdvanceDialogProps) {
  const effectiveDefaultSardar = defaultSardarId ?? initialSardarPartyId ?? '';
  const { sites, activeSiteId } = useSession();
  const [siteId, setSiteId] = useState(activeSiteId || sites[0]?.id || '');
  const [sardarPartyId, setSardarPartyId] = useState(effectiveDefaultSardar);
  const [workerId, setWorkerId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [cashBankLedgerId, setCashBankLedgerId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [serverWarning, setServerWarning] = useState<string | null>(null);

  const { data: sardars } = useParties({ type: 'sardar', limit: 100 });
  const { data: ledgers, isLoading: loadingLedgers } = useLedgers();
  const { data: workers } = useWorkers();

  const { data: exposure, isLoading: loadingExposure } = useSardarExposure(sardarPartyId);

  const mutation = useCreateAdvance();
  const serverFieldErrors = fieldErrorsOf(mutation.error);
  const generalError = mutation.isError && Object.keys(serverFieldErrors).length === 0;

  useEffect(() => {
    if (effectiveDefaultSardar) {
      setSardarPartyId(effectiveDefaultSardar);
    }
  }, [effectiveDefaultSardar]);

  useEffect(() => {
    if (activeSiteId && !siteId) {
      setSiteId(activeSiteId);
    } else if (sites[0]?.id && !siteId) {
      setSiteId(sites[0].id);
    }
  }, [activeSiteId, sites, siteId]);

  // Set default cash/bank ledger if available
  useEffect(() => {
    if (ledgers && ledgers.length > 0 && !cashBankLedgerId) {
      const activeLedgers = ledgers.filter((l) => l.isActive);
      const defaultLedger = activeLedgers.find((l) => l.name.toLowerCase().includes('cash')) ?? activeLedgers[0];
      if (defaultLedger) {
        setCashBankLedgerId(defaultLedger.id);
      }
    }
  }, [ledgers, cashBankLedgerId]);

  const close = () => {
    mutation.reset();
    setSardarPartyId(effectiveDefaultSardar);
    setWorkerId('');
    setDate(todayISO());
    setAmount('');
    setPaymentMode('cash');
    setRemarks('');
    setServerWarning(null);
    onClose();
  };

  const enteredPaise = toPaise(amount);
  const netPaise = exposure ? toPaise(exposure.netExposure) : 0;
  const createsExposure = netPaise + enteredPaise > 0;
  const isCurrentlyExposed = exposure?.isExposed ?? false;
  const willBeExposed = isCurrentlyExposed || (enteredPaise > 0 && createsExposure);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !sardarPartyId || !date || !amount || !cashBankLedgerId) return;

    mutation.mutate(
      {
        siteId,
        sardarPartyId,
        workerId: workerId ? workerId : null,
        date,
        amount,
        paymentMode,
        cashBankLedgerId,
        remarks: remarks.trim() ? remarks.trim() : null,
      },
      {
        onSuccess: (result) => {
          if (result?.warning) {
            setServerWarning(result.warning);
          } else {
            close();
          }
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Give Cash Advance (LAB-05 & LEK-03)"
      description="Record an advance given to a Sardar or worker. Generates a balanced payment voucher in accounting."
    >
      {serverWarning ? (
        <div className="flex flex-col gap-4">
          <Alert variant="warning">
            <p className="font-semibold">Advance Recorded with LEK-03 Warning</p>
            <p className="mt-1 text-xs">{serverWarning}</p>
          </Alert>
          <DialogFooter>
            <Button type="button" onClick={close} className="min-h-[44px]">
              Acknowledge & Close
            </Button>
          </DialogFooter>
        </div>
      ) : (
        <form id="advance-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {generalError && <Alert variant="error">{messageOf(mutation.error, 'Could not create advance')}</Alert>}

          <fieldset disabled={mutation.isPending} className="flex flex-col gap-4 border-0 p-0">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                id="adv-site"
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
                id="adv-sardar"
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

            {/* LIVE LEK-03 Sardar Advance Exposure Card */}
            {sardarPartyId && (
              <div className="rounded-lg border border-border bg-surface-muted/30 p-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  LEK-03 Sardar Live Exposure
                </span>
                {loadingExposure ? (
                  <p className="mt-1 text-xs text-muted-foreground">Checking live exposure…</p>
                ) : exposure ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div>
                        <p className="text-muted-foreground">Advances Drawn</p>
                        <p className="font-medium text-foreground">{formatINR(exposure.advancesDrawn)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Wages Earned</p>
                        <p className="font-medium text-foreground">{formatINR(exposure.wagesEarned)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Deductions</p>
                        <p className="font-medium text-foreground">{formatINR(exposure.deductionsTotal)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Net Exposure</p>
                        <p className={`font-semibold ${exposure.isExposed ? 'text-danger' : 'text-foreground'}`}>
                          {formatINR(exposure.netExposure)}
                        </p>
                      </div>
                    </div>

                    {willBeExposed && (
                      <Alert variant="warning" className="mt-1">
                        {exposure.warning ||
                          'LEK-03 Warning: This advance creates or increases unsecured exposure for this Sardar. Advances will exceed earned wages.'}
                      </Alert>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                id="adv-worker"
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
                id="adv-date"
                label="Advance Date *"
                type="date"
                required
                value={date}
                error={serverFieldErrors.date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                id="adv-amount"
                label="Amount (₹) *"
                inputMode="decimal"
                placeholder="5000.00"
                required
                value={amount}
                error={serverFieldErrors.amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <Select
                id="adv-mode"
                label="Payment Mode *"
                value={paymentMode}
                required
                error={serverFieldErrors.paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              >
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {PAYMENT_MODE_LABELS[mode]}
                  </option>
                ))}
              </Select>

              <Select
                id="adv-ledger"
                label="Cash/Bank Ledger *"
                value={cashBankLedgerId}
                required
                disabled={loadingLedgers}
                error={serverFieldErrors.cashBankLedgerId}
                onChange={(e) => setCashBankLedgerId(e.target.value)}
              >
                <option value="">{loadingLedgers ? 'Loading ledgers…' : 'Select Ledger…'}</option>
                {ledgers
                  ?.filter((l) => l.isActive)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </Select>
            </div>

            <Input
              id="adv-remarks"
              label="Remarks"
              placeholder="Advance purpose, voucher remarks…"
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
              form="advance-form"
              disabled={mutation.isPending || !sardarPartyId || !amount || !cashBankLedgerId}
              className="min-h-[44px]"
            >
              {mutation.isPending ? 'Processing advance…' : 'Give Advance'}
            </Button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}
