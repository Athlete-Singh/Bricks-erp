'use client';

import { formatDate, formatINR, SettlementStatus } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { messageOf } from '@/features/auth/use-auth';
import { useSettlement } from '@/features/labour/hooks';

export interface SettlementDetailDialogProps {
  open?: boolean;
  onClose: () => void;
  settlementId: string | null;
}

function statusBadge(status: SettlementStatus) {
  switch (status) {
    case SettlementStatus.PAID:
      return <Badge variant="success">Settled & Paid</Badge>;
    case SettlementStatus.POSTED:
      return <Badge variant="default">Posted</Badge>;
    case SettlementStatus.DRAFT:
    default:
      return <Badge variant="muted">Draft</Badge>;
  }
}

export function SettlementDetailDialog({ open, onClose, settlementId }: SettlementDetailDialogProps) {
  const isDialogOpen = open !== undefined ? open : Boolean(settlementId);
  const {
    data: settlement,
    isLoading,
    isError,
    error,
  } = useSettlement(isDialogOpen && settlementId ? settlementId : null);

  return (
    <Dialog
      open={isDialogOpen}
      onClose={onClose}
      title="Settlement Statement (LAB-07)"
      description="Detailed statement of gross earnings, advances recovered, deductions and final payout."
      className="max-w-lg"
    >
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : isError ? (
        <Alert variant="error">{messageOf(error, 'Could not load settlement details')}</Alert>
      ) : !settlement ? (
        <p className="text-center text-sm text-muted-foreground py-8">No settlement data found.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Header Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <p className="text-xs text-muted-foreground">Sardar Party</p>
              <h3 className="text-base font-semibold text-foreground">{settlement.sardarParty?.name ?? 'Sardar'}</h3>
              {settlement.sardarParty?.phone && (
                <p className="text-xs text-muted-foreground">{settlement.sardarParty.phone}</p>
              )}
            </div>
            <div>{statusBadge(settlement.status)}</div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-border/60 bg-surface-muted/30 p-2.5">
              <span className="text-xs text-muted-foreground">Settlement Period</span>
              <p className="font-medium text-foreground mt-0.5">
                {formatDate(settlement.periodFrom)} to {formatDate(settlement.periodTo)}
              </p>
            </div>

            <div className="rounded-md border border-border/60 bg-surface-muted/30 p-2.5">
              <span className="text-xs text-muted-foreground">Voucher Reference</span>
              <p className="font-medium text-foreground mt-0.5 font-mono text-xs truncate">
                {settlement.voucherId ? `Voucher: ${settlement.voucherId}` : 'No payment voucher'}
              </p>
            </div>
          </div>

          {/* Statement Financial Breakdown */}
          <div className="rounded-lg border border-border bg-surface p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Financial Breakdown
            </h4>

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Gross Earned Wages</span>
                <span className="font-medium text-foreground">{formatINR(settlement.grossWages)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Advances Recovered</span>
                <span className="font-medium text-danger">- {formatINR(settlement.advancesRecovered)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Wage Deductions (Khurak/Loans)</span>
                <span className="font-medium text-danger">- {formatINR(settlement.deductions)}</span>
              </div>

              <div className="flex justify-between pt-2 text-base font-bold">
                <span className="text-foreground">Net Payout Due</span>
                <span className={Number(settlement.netPayable) < 0 ? 'text-danger' : 'text-primary'}>
                  {formatINR(settlement.netPayable)}
                </span>
              </div>
            </div>
          </div>

          {settlement.remarks && (
            <div className="rounded-md border border-border/60 bg-surface-muted/20 p-2.5 text-xs text-muted-foreground">
              <strong className="text-foreground">Remarks:</strong> {settlement.remarks}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="min-h-[44px] w-full sm:w-auto">
              Close Statement
            </Button>
          </DialogFooter>
        </div>
      )}
    </Dialog>
  );
}
