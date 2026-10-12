'use client';

import { useEffect, useState } from 'react';
import { PAYMENT_MODES, PaymentMode, formatINR, fromPaise, toPaise, todayISO } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useLedgers } from '@/features/accounting/hooks';
import { fieldErrorsOf, messageOf, useSession } from '@/features/auth/use-auth';
import { useParties } from '@/features/masters/hooks';
import { useCreateSettlement, useSardarExposure } from '@/features/labour/hooks';

export interface SettlementDialogProps {
  open: boolean;
  onClose: () => void;
  defaultSardarId?: string;
}

const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  cash: 'Cash',
  bank: 'Bank / Cheque',
  upi: 'UPI',
  credit: 'Credit',
};

export function SettlementDialog({ open, onClose, defaultSardarId }: SettlementDialogProps) {
  const { sites, activeSiteId } = useSession();
  const [siteId, setSiteId] = useState(activeSiteId || sites[0]?.id || '');
  const [sardarPartyId, setSardarPartyId] = useState(defaultSardarId ?? '');
  const [periodFrom, setPeriodFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [periodTo, setPeriodTo] = useState(todayISO());
  const [advancesRecovered, setAdvancesRecovered] = useState('0.00');
  const [deductions, setDeductions] = useState('0.00');
  const [immediatePayout, setImmediatePayout] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank');
  const [cashBankLedgerId, setCashBankLedgerId] = useState('');
  const [remarks, setRemarks] = useState('');

  const { data: sardars } = useParties({ type: 'sardar', limit: 100 });
  const { data: ledgers, isLoading: loadingLedgers } = useLedgers();
  const { data: exposure, isLoading: loadingExposure } = useSardarExposure(sardarPartyId);

  const mutation = useCreateSettlement();
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

  // When exposure loads, initialize advances and deductions if still default
  useEffect(() => {
    if (exposure) {
      setAdvancesRecovered(exposure.advancesDrawn);
      setDeductions(exposure.deductionsTotal);
    }
  }, [exposure]);

  // Set default cash/bank ledger if available
  useEffect(() => {
    if (ledgers && ledgers.length > 0 && !cashBankLedgerId) {
      const activeLedgers = ledgers.filter((l) => l.isActive);
      const defaultLedger = activeLedgers.find((l) => l.name.toLowerCase().includes('bank')) ?? activeLedgers[0];
      if (defaultLedger) {
        setCashBankLedgerId(defaultLedger.id);
      }
    }
  }, [ledgers, cashBankLedgerId]);

  const close = () => {
    mutation.reset();
    setSardarPartyId(defaultSardarId ?? '');
    setAdvancesRecovered('0.00');
    setDeductions('0.00');
    setImmediatePayout(false);
    setRemarks('');
    onClose();
  };

  const grossWages = exposure?.wagesEarned ?? '0.00';
  const grossPaise = toPaise(grossWages);
  const advPaise = toPaise(advancesRecovered);
  const dedPaise = toPaise(deductions);
  const netPaise = grossPaise - advPaise - dedPaise;
  const netPayable = fromPaise(netPaise);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !sardarPartyId || !periodFrom || !periodTo) return;

    mutation.mutate(
      {
        siteId,
        sardarPartyId,
        periodFrom,
        periodTo,
        advancesRecovered: advancesRecovered.trim() || '0.00',
        deductions: deductions.trim() || '0.00',
        paymentMode: immediatePayout ? paymentMode : undefined,
        cashBankLedgerId: immediatePayout && cashBankLedgerId ? cashBankLedgerId : null,
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
      title="Create Labour Settlement (LAB-07)"
      description="Calculate net wages due to a Sardar by reconciling gross wages against advances and deductions."
      className="max-w-2xl"
    >
      <form id="settlement-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {generalError && (
          <Alert variant="error">{messageOf(mutation.error, 'Could not create labour settlement')}</Alert>
        )}

        <fieldset disabled={mutation.isPending} className="flex flex-col gap-4 border-0 p-0">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              id="set-site"
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
              id="set-sardar"
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

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="set-period-from"
              label="Period From *"
              type="date"
              required
              value={periodFrom}
              error={serverFieldErrors.periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
            />

            <Input
              id="set-period-to"
              label="Period To *"
              type="date"
              required
              value={periodTo}
              error={serverFieldErrors.periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
            />
          </div>

          {/* Real-time Calculation & Exposure Breakdown */}
          {sardarPartyId && (
            <div className="rounded-lg border border-border bg-surface-muted/30 p-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Settlement Statement Breakdown
              </span>

              {loadingExposure ? (
                <p className="mt-2 text-xs text-muted-foreground">Fetching Sardar wage data…</p>
              ) : (
                <div className="mt-3 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-md border border-border/60 bg-surface p-2.5">
                      <p className="text-xs text-muted-foreground">Gross Wages</p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">{formatINR(grossWages)}</p>
                    </div>

                    <div className="rounded-md border border-border/60 bg-surface p-2.5">
                      <p className="text-xs text-muted-foreground">Advances Recovered</p>
                      <p className="mt-0.5 text-sm font-semibold text-danger">- {formatINR(advancesRecovered || 0)}</p>
                    </div>

                    <div className="rounded-md border border-border/60 bg-surface p-2.5">
                      <p className="text-xs text-muted-foreground">Deductions</p>
                      <p className="mt-0.5 text-sm font-semibold text-danger">- {formatINR(deductions || 0)}</p>
                    </div>

                    <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5">
                      <p className="text-xs font-medium text-primary">Net Payable</p>
                      <p className={`mt-0.5 text-base font-bold ${netPaise < 0 ? 'text-danger' : 'text-primary'}`}>
                        {formatINR(netPayable)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      id="set-adv-rec"
                      label="Advances to Recover (₹) *"
                      inputMode="decimal"
                      placeholder="0.00"
                      required
                      value={advancesRecovered}
                      error={serverFieldErrors.advancesRecovered}
                      onChange={(e) => setAdvancesRecovered(e.target.value)}
                    />

                    <Input
                      id="set-deductions"
                      label="Deductions to Apply (₹) *"
                      inputMode="decimal"
                      placeholder="0.00"
                      required
                      value={deductions}
                      error={serverFieldErrors.deductions}
                      onChange={(e) => setDeductions(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Immediate Payout Section */}
          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={immediatePayout}
                onChange={(e) => setImmediatePayout(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="font-medium">Execute immediate settlement payment voucher</span>
            </label>

            {immediatePayout && (
              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/60">
                <Select
                  id="set-mode"
                  label="Payment Mode *"
                  value={paymentMode}
                  required={immediatePayout}
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
                  id="set-ledger"
                  label="Disbursement Bank / Cash Ledger *"
                  value={cashBankLedgerId}
                  required={immediatePayout}
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
            )}
          </div>

          <Input
            id="set-remarks"
            label="Remarks"
            placeholder="Settlement notes, season closing remarks…"
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
            form="settlement-form"
            disabled={mutation.isPending || !siteId || !sardarPartyId}
            className="min-h-[44px]"
          >
            {mutation.isPending ? 'Generating settlement…' : 'Save Settlement (LAB-07)'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
