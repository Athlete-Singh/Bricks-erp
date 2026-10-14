'use client';

import { useEffect, useState } from 'react';
import type { BillingCycle, SubscriptionStatus, UpdateTenantSubscriptionDto } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { messageOf } from '@/features/auth/use-auth';
import { usePlatformPlans, useUpdateTenantSubscription } from '../hooks';

export interface EditSubscriptionDialogProps {
  tenantId: string;
  current: {
    planName: string;
    billingCycle: 'monthly' | 'yearly' | 'custom';
    subscriptionStatus: string;
    trialEndsAt: string | null;
    gracePeriodDays: number;
  };
  open: boolean;
  onClose: () => void;
}

const STANDARD_PLANS = ['starter', 'growth', 'enterprise'] as const;

export function EditSubscriptionDialog({ tenantId, current, open, onClose }: EditSubscriptionDialogProps) {
  const update = useUpdateTenantSubscription();
  const { data: plans } = usePlatformPlans();

  const isStandardPlan = STANDARD_PLANS.includes(current.planName?.toLowerCase() as (typeof STANDARD_PLANS)[number]);

  const [selectedPlan, setSelectedPlan] = useState<string>(isStandardPlan ? current.planName.toLowerCase() : 'custom');
  const [customPlanName, setCustomPlanName] = useState<string>(isStandardPlan ? '' : current.planName || '');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(current.billingCycle ?? 'monthly');
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>(
    (current.subscriptionStatus as SubscriptionStatus) || 'trial',
  );
  const [trialEndsAt, setTrialEndsAt] = useState<string>(current.trialEndsAt ? current.trialEndsAt.slice(0, 10) : '');
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(current.gracePeriodDays ?? 0);

  const resetUpdate = update.reset;
  useEffect(() => {
    if (open) {
      const isStd = STANDARD_PLANS.includes(current.planName?.toLowerCase() as (typeof STANDARD_PLANS)[number]);
      setSelectedPlan(isStd ? current.planName.toLowerCase() : 'custom');
      setCustomPlanName(isStd ? '' : current.planName || '');
      setBillingCycle(current.billingCycle ?? 'monthly');
      setSubscriptionStatus((current.subscriptionStatus as SubscriptionStatus) || 'trial');
      setTrialEndsAt(current.trialEndsAt ? current.trialEndsAt.slice(0, 10) : '');
      setGracePeriodDays(current.gracePeriodDays ?? 0);
      resetUpdate();
    }
  }, [open, current, resetUpdate]);

  const handleClose = () => {
    update.reset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const planName = selectedPlan === 'custom' ? customPlanName.trim() || 'custom' : selectedPlan;

    const dto: UpdateTenantSubscriptionDto = {
      planName,
      billingCycle,
      subscriptionStatus,
      trialEndsAt: trialEndsAt ? trialEndsAt : null,
      gracePeriodDays: Number(gracePeriodDays) || 0,
    };

    update.mutate(
      { id: tenantId, dto },
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
      title="Edit Subscription"
      description="Update subscription plan, billing cycle, status and trial limits."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {update.isError && (
          <Alert variant="error">{messageOf(update.error, 'Could not update tenant subscription')}</Alert>
        )}

        <div className="flex flex-col gap-1">
          <Select
            label="Plan"
            id="plan-selector"
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
          >
            {plans && plans.length > 0 ? (
              plans.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name} ({p.code})
                </option>
              ))
            ) : (
              <>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </>
            )}
            <option value="custom">Custom plan…</option>
          </Select>
        </div>

        {selectedPlan === 'custom' && (
          <Input
            label="Custom plan name"
            id="custom-plan-name"
            value={customPlanName}
            onChange={(e) => setCustomPlanName(e.target.value)}
            placeholder="e.g. pilot-special"
            required
          />
        )}

        <Select
          label="Billing cycle"
          id="billing-cycle-selector"
          value={billingCycle}
          onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
        >
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="custom">Custom</option>
        </Select>

        <Select
          label="Subscription status"
          id="subscription-status-selector"
          value={subscriptionStatus}
          onChange={(e) => setSubscriptionStatus(e.target.value as SubscriptionStatus)}
        >
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            label="Trial ends date"
            id="trial-ends-at"
            value={trialEndsAt}
            onChange={(e) => setTrialEndsAt(e.target.value)}
          />

          <Input
            type="number"
            min={0}
            max={90}
            label="Grace period (days)"
            id="grace-period-days"
            value={gracePeriodDays}
            onChange={(e) => setGracePeriodDays(Number(e.target.value))}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={update.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? <Spinner className="text-primary-foreground" /> : 'Save changes'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
