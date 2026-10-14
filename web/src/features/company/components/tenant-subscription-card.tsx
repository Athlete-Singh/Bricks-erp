'use client';

import { Check, CreditCard, Receipt } from 'lucide-react';
import {
  formatINR,
  type BillingCycle,
  type InvoiceStatus,
  type PlatformInvoiceDto,
  type PlatformPlan,
  type SubscriptionStatus,
} from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { messageOf } from '@/features/auth/use-auth';
import { useCurrentTenantBilling } from '../hooks';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDisplayDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const datePart = iso.slice(0, 10);
  const parts = datePart.split('-');
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const y = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(monthIndex) && monthIndex >= 0 && monthIndex < 12 && !isNaN(day)) {
      return `${day} ${MONTHS[monthIndex]} ${y}`;
    }
  }
  return datePart;
}

export function formatPriceDisplay(plan: PlatformPlan | null, cycle: BillingCycle): string | null {
  if (!plan) {
    return cycle ? `Billed ${cycle}` : null;
  }
  const rawPrice = cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
  const num = Number(rawPrice);
  const unit = cycle === 'yearly' ? 'year' : 'month';
  if (cycle === 'custom') {
    return `${Number.isFinite(num) && Number.isInteger(num) ? `₹${num.toLocaleString('en-IN')}` : formatINR(rawPrice)} / custom`;
  }
  if (Number.isFinite(num) && Number.isInteger(num)) {
    return `₹${num.toLocaleString('en-IN')} / ${unit}`;
  }
  return `${formatINR(rawPrice)} / ${unit}`;
}

export function getRenewalOrTrialText(
  subscriptionStatus: SubscriptionStatus,
  trialEndsAt: string | null,
  gracePeriodDays: number,
  invoices: PlatformInvoiceDto[],
): string | null {
  if (trialEndsAt) {
    const formattedDate = formatDisplayDate(trialEndsAt);
    const grace = gracePeriodDays > 0 ? ` (${gracePeriodDays} days grace period)` : '';
    return `Trial ends on ${formattedDate}${grace}`;
  }

  const unpaid = invoices.find((inv) => inv.status === 'pending' || inv.status === 'overdue');
  if (unpaid?.dueDate) {
    return `Payment due on ${formatDisplayDate(unpaid.dueDate)}`;
  }

  const latest = invoices[0];
  if (latest?.periodEnd) {
    return `Next renewal on ${formatDisplayDate(latest.periodEnd)}`;
  }

  return null;
}

function getSubscriptionBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'active':
      return <Badge variant="success">Active</Badge>;
    case 'trial':
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Trial</Badge>;
    case 'past_due':
    case 'past-due':
      return <Badge variant="danger">Past Due</Badge>;
    case 'canceled':
    case 'cancelled':
      return <Badge variant="muted">Canceled</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

function getInvoiceBadge(status: InvoiceStatus | string) {
  switch (status.toLowerCase()) {
    case 'paid':
      return <Badge variant="success">Paid</Badge>;
    case 'pending':
      return <Badge variant="warning">Pending</Badge>;
    case 'overdue':
      return <Badge variant="danger">Overdue</Badge>;
    case 'void':
      return <Badge variant="muted">Void</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

export function TenantSubscriptionCard() {
  const { data: billing, isLoading, error } = useCurrentTenantBilling();

  if (isLoading) {
    return (
      <Card className="flex flex-col gap-4 p-6" role="status" aria-label="Loading subscription details">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Card>
    );
  }

  if (error) {
    return <Alert variant="error">{messageOf(error, 'Could not load subscription details')}</Alert>;
  }

  if (!billing) {
    return null;
  }

  const currentPlan = billing.currentPlan;
  const planDisplayName =
    currentPlan?.name ||
    (billing.planName ? billing.planName.charAt(0).toUpperCase() + billing.planName.slice(1) : 'Custom');
  const priceDisplay = formatPriceDisplay(currentPlan, billing.billingCycle);
  const renewalOrTrialText = getRenewalOrTrialText(
    billing.subscriptionStatus,
    billing.trialEndsAt,
    billing.gracePeriodDays,
    billing.invoices,
  );

  return (
    <Card className="flex flex-col gap-6 p-6">
      <CardHeader className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-brand-600 dark:text-brand-400" aria-hidden />
            <div>
              <CardTitle className="text-lg">Subscription & Plan</CardTitle>
              <p className="text-xs text-muted-foreground">
                Your subscription tier, plan limits, and platform invoices.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{planDisplayName}</span>
            {getSubscriptionBadge(billing.subscriptionStatus)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6 p-0 text-foreground">
        {/* Plan Details & Limits Box */}
        <div className="rounded-lg border border-border bg-surface-muted/30 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              {priceDisplay && <div className="text-2xl font-bold tracking-tight text-foreground">{priceDisplay}</div>}
              {renewalOrTrialText && (
                <div className="mt-1 text-xs font-medium text-muted-foreground">{renewalOrTrialText}</div>
              )}
            </div>
            <div className="text-xs text-muted-foreground text-right space-y-1">
              <div>
                Billing Cycle: <span className="font-medium capitalize text-foreground">{billing.billingCycle}</span>
              </div>
              {currentPlan?.maxKilns != null && (
                <div>
                  Kilns Limit: <span className="font-medium text-foreground">{currentPlan.maxKilns}</span>
                </div>
              )}
              {currentPlan?.maxUsers != null && (
                <div>
                  Users Limit: <span className="font-medium text-foreground">{currentPlan.maxUsers}</span>
                </div>
              )}
            </div>
          </div>

          {/* Features checkmarks list */}
          {currentPlan?.features && currentPlan.features.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">Included Features:</div>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                {currentPlan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs text-foreground">
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Invoices History */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden />
            <h4 className="text-sm font-semibold text-foreground">Platform Invoices</h4>
          </div>

          {billing.invoices.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              No platform invoices yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-surface-muted text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Invoice #</th>
                      <th className="px-4 py-2.5 font-medium">Billing Period</th>
                      <th className="px-4 py-2.5 font-medium text-right">Total Amount</th>
                      <th className="px-4 py-2.5 font-medium">Due Date</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Payment Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {billing.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-surface-muted/50">
                        <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-foreground">
                          {inv.invoiceNumber}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {formatDisplayDate(inv.periodStart)} - {formatDisplayDate(inv.periodEnd)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-foreground">
                          {formatINR(inv.totalAmount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {formatDisplayDate(inv.dueDate)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">{getInvoiceBadge(inv.status)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                          {inv.status === 'paid' ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">
                                {inv.paidAt ? `Paid on ${formatDisplayDate(inv.paidAt)}` : 'Paid'}
                              </span>
                              {(inv.paymentRef || inv.paymentMethod) && (
                                <span className="text-[11px] text-muted-foreground">
                                  {[inv.paymentMethod?.toUpperCase(), inv.paymentRef].filter(Boolean).join(' • ')}
                                </span>
                              )}
                            </div>
                          ) : (
                            '—'
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

        {/* Contact Support Note */}
        <div className="rounded-md border border-border bg-surface-muted/40 p-3 text-xs text-muted-foreground">
          To change your subscription plan or request billing assistance, please contact platform support.
        </div>
      </CardContent>
    </Card>
  );
}
