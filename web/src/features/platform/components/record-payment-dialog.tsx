'use client';

import { useEffect, useState } from 'react';
import type { PaymentMethod, PlatformInvoiceDto, RecordPlatformPaymentDto } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { messageOf } from '@/features/auth/use-auth';
import { useRecordPlatformPayment } from '../hooks';

export interface RecordPaymentDialogProps {
  invoice: PlatformInvoiceDto | null;
  tenantId: string;
  open: boolean;
  onClose: () => void;
}

export function RecordPaymentDialog({ invoice, tenantId, open, onClose }: RecordPaymentDialogProps) {
  const recordPayment = useRecordPlatformPayment();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paidAt, setPaidAt] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const resetRecordPayment = recordPayment.reset;
  useEffect(() => {
    if (open) {
      setPaymentMethod('upi');
      setPaymentRef('');
      setPaidAt(new Date().toISOString().slice(0, 10));
      setNotes('');
      setValidationError(null);
      resetRecordPayment();
    }
  }, [open, invoice, resetRecordPayment]);

  if (!invoice) return null;

  const handleClose = () => {
    recordPayment.reset();
    setValidationError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedRef = paymentRef.trim();
    if (!trimmedRef) {
      setValidationError('Payment reference / UTR is required');
      return;
    }

    const dto: RecordPlatformPaymentDto = {
      paymentMethod,
      paymentRef: trimmedRef,
      paidAt: paidAt || undefined,
      notes: notes.trim() || undefined,
    };

    recordPayment.mutate(
      { invoiceId: invoice.id, tenantId, dto },
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
      title="Record Payment"
      description={`Record payment for invoice ${invoice.invoiceNumber}.`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {validationError && <Alert variant="error">{validationError}</Alert>}
        {recordPayment.isError && (
          <Alert variant="error">{messageOf(recordPayment.error, 'Could not record payment')}</Alert>
        )}

        <div className="rounded-lg border border-border bg-surface-muted p-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Invoice #</span>
            <span className="font-semibold text-foreground">{invoice.invoiceNumber}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-muted-foreground">Total Amount Due</span>
            <span className="font-bold text-foreground">₹{invoice.totalAmount}</span>
          </div>
        </div>

        <Select
          label="Payment method"
          id="payment-method-selector"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
        >
          <option value="upi">UPI</option>
          <option value="bank_transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
          <option value="card">Credit / Debit Card</option>
          <option value="cash">Cash</option>
          <option value="manual">Manual / Cheque / Other</option>
        </Select>

        <Input
          label="Payment reference / UTR"
          id="payment-ref-input"
          value={paymentRef}
          onChange={(e) => setPaymentRef(e.target.value)}
          placeholder="e.g. UTR / Transaction ID / Cheque #"
          required
        />

        <Input
          type="date"
          label="Payment date"
          id="payment-date-input"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
          required
        />

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Notes (optional)</span>
          <textarea
            id="payment-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="e.g. Bank name, branch, deposit details…"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </label>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={recordPayment.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={recordPayment.isPending}>
            {recordPayment.isPending ? <Spinner className="text-primary-foreground" /> : 'Confirm payment'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
