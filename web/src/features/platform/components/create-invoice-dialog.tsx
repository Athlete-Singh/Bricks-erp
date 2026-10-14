'use client';

import { useEffect, useState } from 'react';
import type { BillingCycle, CreatePlatformInvoiceDto } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { messageOf } from '@/features/auth/use-auth';
import { useCreatePlatformInvoice, usePlatformPlans } from '../hooks';

export interface CreateInvoiceDialogProps {
  tenantId: string;
  defaultPlan: string;
  defaultCycle: string;
  open: boolean;
  onClose: () => void;
}

function getDefaultDates() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  const due = new Date(start);
  due.setDate(due.getDate() + 15);

  const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

  return {
    periodStart: toDateStr(start),
    periodEnd: toDateStr(end),
    dueDate: toDateStr(due),
  };
}

export function CreateInvoiceDialog({ tenantId, defaultPlan, defaultCycle, open, onClose }: CreateInvoiceDialogProps) {
  const createInvoice = useCreatePlatformInvoice();
  const { data: plans } = usePlatformPlans();

  const [planName, setPlanName] = useState<string>(defaultPlan || 'starter');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>((defaultCycle as BillingCycle) || 'monthly');
  const [amount, setAmount] = useState<string>('2999.00');
  const [taxAmount, setTaxAmount] = useState<string>('0.00');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const resetCreateInvoice = createInvoice.reset;
  useEffect(() => {
    if (open) {
      const dates = getDefaultDates();
      const plan = defaultPlan || 'starter';
      const cycle = (defaultCycle as BillingCycle) || 'monthly';
      setPlanName(plan);
      setBillingCycle(cycle);

      // Default amount based on plan if available
      const matchedPlan = plans?.find((p) => p.code.toLowerCase() === plan.toLowerCase());
      if (matchedPlan) {
        const base = cycle === 'yearly' ? matchedPlan.priceYearly : matchedPlan.priceMonthly;
        setAmount(base);
      } else {
        setAmount('2999.00');
      }

      setTaxAmount('0.00');
      setPeriodStart(dates.periodStart);
      setPeriodEnd(dates.periodEnd);
      setDueDate(dates.dueDate);
      setNotes('');
      setValidationError(null);
      resetCreateInvoice();
    }
  }, [open, defaultPlan, defaultCycle, plans, resetCreateInvoice]);

  const handleClose = () => {
    createInvoice.reset();
    setValidationError(null);
    onClose();
  };

  const handleAddGst = () => {
    const base = Number(amount);
    if (!isNaN(base) && base >= 0) {
      setTaxAmount((base * 0.18).toFixed(2));
    }
  };

  const handlePlanChange = (newPlan: string) => {
    setPlanName(newPlan);
    const matched = plans?.find((p) => p.code.toLowerCase() === newPlan.toLowerCase());
    if (matched) {
      const base = billingCycle === 'yearly' ? matched.priceYearly : matched.priceMonthly;
      setAmount(base);
    }
  };

  const handleCycleChange = (newCycle: BillingCycle) => {
    setBillingCycle(newCycle);
    const matched = plans?.find((p) => p.code.toLowerCase() === planName.toLowerCase());
    if (matched) {
      const base = newCycle === 'yearly' ? matched.priceYearly : matched.priceMonthly;
      setAmount(base);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum < 0) {
      setValidationError('Please enter a valid base amount');
      return;
    }

    const taxNum = Number(taxAmount);
    if (isNaN(taxNum) || taxNum < 0) {
      setValidationError('Please enter a valid tax amount');
      return;
    }

    const formattedAmount = amountNum.toFixed(2);
    const formattedTax = taxNum.toFixed(2);

    const dto: CreatePlatformInvoiceDto = {
      planName: planName.trim() || 'starter',
      billingCycle,
      amount: formattedAmount,
      taxAmount: formattedTax,
      periodStart,
      periodEnd,
      dueDate,
      notes: notes.trim() || undefined,
    };

    createInvoice.mutate(
      { tenantId, dto },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Create Platform Invoice"
      description="Issue a new platform billing invoice for this tenant."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {validationError && <Alert variant="error">{validationError}</Alert>}
        {createInvoice.isError && (
          <Alert variant="error">{messageOf(createInvoice.error, 'Could not create invoice')}</Alert>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Plan name"
            id="invoice-plan-name"
            value={planName}
            onChange={(e) => handlePlanChange(e.target.value)}
            placeholder="starter / growth / enterprise"
            required
          />

          <Select
            label="Billing cycle"
            id="invoice-billing-cycle"
            value={billingCycle}
            onChange={(e) => handleCycleChange(e.target.value as BillingCycle)}
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Base amount (₹)"
            id="invoice-base-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="2999.00"
            required
          />

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">GST Tax amount (₹)</span>
              <button
                type="button"
                onClick={handleAddGst}
                className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                Add 18% GST
              </button>
            </div>
            <input
              id="invoice-tax-amount"
              value={taxAmount}
              onChange={(e) => setTaxAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Input
            type="date"
            label="Period start"
            id="invoice-period-start"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            required
          />

          <Input
            type="date"
            label="Period end"
            id="invoice-period-end"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            required
          />

          <Input
            type="date"
            label="Due date"
            id="invoice-due-date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Notes (optional)</span>
          <textarea
            id="invoice-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="e.g. Annual renewal invoice, custom negotiated rate…"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </label>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={createInvoice.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={createInvoice.isPending}>
            {createInvoice.isPending ? <Spinner className="text-primary-foreground" /> : 'Create invoice'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
