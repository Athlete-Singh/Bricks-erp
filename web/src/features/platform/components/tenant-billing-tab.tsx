'use client';

import { useState } from 'react';
import { CreditCard, Edit, FilePlus, Receipt } from 'lucide-react';
import { PERMISSIONS, type PlatformInvoiceDto } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { CreateInvoiceDialog } from './create-invoice-dialog';
import { EditSubscriptionDialog } from './edit-subscription-dialog';
import { RecordPaymentDialog } from './record-payment-dialog';
import { useTenantBilling } from '../hooks';

export interface TenantBillingTabProps {
  tenantId: string;
}

function getSubscriptionStatusBadgeVariant(status: string) {
  switch (status.toLowerCase()) {
    case 'active':
      return 'success';
    case 'trial':
      return 'warning';
    case 'past_due':
      return 'danger';
    case 'canceled':
      return 'muted';
    default:
      return 'default';
  }
}

function getInvoiceStatusBadgeVariant(status: string) {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'success';
    case 'pending':
      return 'warning';
    case 'overdue':
      return 'danger';
    case 'void':
      return 'muted';
    default:
      return 'default';
  }
}

export function TenantBillingTab({ tenantId }: TenantBillingTabProps) {
  const { can } = useSession();
  const canManage = can(PERMISSIONS.PLATFORM_TENANTS_MANAGE);

  const { data: billing, isLoading, error } = useTenantBilling(tenantId);

  const [editOpen, setEditOpen] = useState(false);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<PlatformInvoiceDto | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner label="Loading billing information…" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">{messageOf(error, 'Could not load tenant billing details')}</Alert>;
  }

  if (!billing) return null;

  const currentPlan = billing.currentPlan;
  const planDisplayName = currentPlan?.name || billing.planName || 'Custom';
  const priceDisplay = currentPlan
    ? billing.billingCycle === 'yearly'
      ? `₹${currentPlan.priceYearly} / yr`
      : `₹${currentPlan.priceMonthly} / mo`
    : `Billed ${billing.billingCycle}`;

  const kilnsLimit = currentPlan?.maxKilns != null ? `${currentPlan.maxKilns} kilns` : 'Unlimited kilns';
  const usersLimit = currentPlan?.maxUsers != null ? `${currentPlan.maxUsers} users` : 'Unlimited users';

  return (
    <div className="flex flex-col gap-6">
      {/* Top Summary Card & Actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <Card className="flex flex-1 flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-surface-muted p-2 text-foreground">
                <CreditCard className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">{planDisplayName} Plan</h3>
                  <Badge variant={getSubscriptionStatusBadgeVariant(billing.subscriptionStatus)}>
                    {billing.subscriptionStatus.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {priceDisplay} · {billing.billingCycle} billing cycle
                </p>
              </div>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} aria-label="Edit Subscription">
                  <Edit className="h-3.5 w-3.5" aria-hidden />
                  Edit Subscription
                </Button>
                <Button size="sm" onClick={() => setCreateInvoiceOpen(true)} aria-label="Create Invoice">
                  <FilePlus className="h-3.5 w-3.5" aria-hidden />
                  Create Invoice
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Kilns Limit</span>
              <p className="text-sm font-semibold text-foreground">{kilnsLimit}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Users Limit</span>
              <p className="text-sm font-semibold text-foreground">{usersLimit}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Trial / Expiry</span>
              <p className="text-sm font-semibold text-foreground">
                {billing.trialEndsAt ? new Date(billing.trialEndsAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Grace Period</span>
              <p className="text-sm font-semibold text-foreground">{billing.gracePeriodDays ?? 0} days</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Invoices Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Platform Invoices</h3>
            <p className="text-xs text-muted-foreground">Billing history and payment records issued by the platform.</p>
          </div>
        </div>

        {billing.invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No platform invoices"
            description="No invoices have been issued for this tenant yet."
            action={
              canManage ? (
                <Button size="sm" onClick={() => setCreateInvoiceOpen(true)}>
                  <FilePlus className="h-3.5 w-3.5" aria-hidden />
                  Create First Invoice
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Invoice #</th>
                    <th className="px-4 py-3 font-medium">Period</th>
                    <th className="px-4 py-3 font-medium">Due Date</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium text-right">Tax</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Payment Ref / Date</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {billing.invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-surface-muted/50">
                      <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-foreground">
                        {inv.invoiceNumber}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {inv.periodStart} to {inv.periodEnd}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{inv.dueDate}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-foreground">
                        ₹{inv.amount}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">₹{inv.taxAmount}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-foreground">
                        ₹{inv.totalAmount}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge variant={getInvoiceStatusBadgeVariant(inv.status)}>{inv.status.toUpperCase()}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {inv.status === 'paid' ? (
                          <div>
                            <span className="font-medium text-foreground">{inv.paymentRef}</span>
                            {inv.paidAt && (
                              <span className="block text-[11px] text-muted-foreground">
                                {new Date(inv.paidAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {inv.status !== 'paid' && canManage ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPaymentInvoice(inv)}
                            aria-label={`Record payment for ${inv.invoiceNumber}`}
                          >
                            Record payment
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <EditSubscriptionDialog
        tenantId={tenantId}
        current={{
          planName: billing.planName || 'starter',
          billingCycle: billing.billingCycle || 'monthly',
          subscriptionStatus: billing.subscriptionStatus || 'trial',
          trialEndsAt: billing.trialEndsAt,
          gracePeriodDays: billing.gracePeriodDays ?? 0,
        }}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />

      <CreateInvoiceDialog
        tenantId={tenantId}
        defaultPlan={billing.planName || 'starter'}
        defaultCycle={billing.billingCycle || 'monthly'}
        open={createInvoiceOpen}
        onClose={() => setCreateInvoiceOpen(false)}
      />

      <RecordPaymentDialog
        invoice={paymentInvoice}
        tenantId={tenantId}
        open={Boolean(paymentInvoice)}
        onClose={() => setPaymentInvoice(null)}
      />
    </div>
  );
}
