'use client';

import { useEffect, useState } from 'react';
import { WageActivity } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { fieldErrorsOf, messageOf, useSession } from '@/features/auth/use-auth';
import { useParties } from '@/features/masters/hooks';
import type { LabourGroup } from '@/features/labour/api';
import { useCreateLabourGroup, useUpdateLabourGroup } from '@/features/labour/hooks';

export interface GroupDialogProps {
  open: boolean;
  onClose: () => void;
  initial?: LabourGroup | null;
  /** Backwards compatibility alias for initial */
  group?: LabourGroup | null;
}

const ACTIVITY_OPTIONS: { value: WageActivity; label: string }[] = [
  { value: WageActivity.MAKING, label: 'Brick Making (Patheri)' },
  { value: WageActivity.LOADING, label: 'Chamber Loading (Bharai)' },
  { value: WageActivity.UNLOADING, label: 'Chamber Unloading (Nikasi)' },
  { value: WageActivity.DAILY_WAGE, label: 'Daily Wage (Dihadi)' },
];

export function GroupDialog({ open, onClose, initial, group }: GroupDialogProps) {
  const currentGroup = initial ?? group;
  const { sites } = useSession();
  const [name, setName] = useState('');
  const [sardarPartyId, setSardarPartyId] = useState('');
  const [activity, setActivity] = useState<WageActivity>(WageActivity.MAKING);
  const [siteId, setSiteId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const { data: sardars } = useParties({ type: 'sardar', limit: 100 });

  const create = useCreateLabourGroup();
  const update = useUpdateLabourGroup();
  const mut = currentGroup ? update : create;

  const serverFieldErrors = fieldErrorsOf(mut.error);
  const generalError = mut.isError && Object.keys(serverFieldErrors).length === 0;

  useEffect(() => {
    if (currentGroup) {
      setName(currentGroup.name);
      setSardarPartyId(currentGroup.sardarPartyId);
      setActivity(currentGroup.activity);
      setSiteId(currentGroup.siteId ?? '');
      setIsActive(currentGroup.isActive);
    } else {
      setName('');
      setSardarPartyId('');
      setActivity(WageActivity.MAKING);
      setSiteId('');
      setIsActive(true);
    }
  }, [currentGroup, open]);

  const close = () => {
    mut.reset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sardarPartyId || !activity) return;

    if (currentGroup) {
      update.mutate(
        {
          id: currentGroup.id,
          dto: {
            name,
            sardarPartyId,
            activity,
            siteId: siteId || undefined,
            isActive,
          },
        },
        { onSuccess: close },
      );
    } else {
      create.mutate(
        {
          name,
          sardarPartyId,
          activity,
          siteId: siteId || undefined,
          isActive,
        },
        { onSuccess: close },
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={currentGroup ? 'Edit Labour Group' : 'New Labour Group (LAB-01)'}
      description="A labour gang under a Sardar assigned to specific brick production activities."
    >
      <form id="group-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {generalError && <Alert variant="error">{messageOf(mut.error, 'Could not save labour group')}</Alert>}

        <fieldset disabled={mut.isPending} className="flex flex-col gap-4 border-0 p-0">
          <Input
            id="group-name"
            label="Group Name *"
            placeholder="e.g. Ramesh Patheri Gang"
            required
            value={name}
            error={serverFieldErrors.name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              id="group-sardar"
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

            <Select
              id="group-activity"
              label="Activity *"
              value={activity}
              required
              error={serverFieldErrors.activity}
              onChange={(e) => setActivity(e.target.value as WageActivity)}
            >
              {ACTIVITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <Select
            id="group-site"
            label="Kiln / Site (Optional)"
            value={siteId}
            error={serverFieldErrors.siteId}
            onChange={(e) => setSiteId(e.target.value)}
          >
            <option value="">All Kilns / Unassigned</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span>Active group</span>
          </label>
        </fieldset>

        <DialogFooter>
          <Button variant="ghost" type="button" onClick={close} disabled={mut.isPending} className="min-h-[44px]">
            Cancel
          </Button>
          <Button
            type="submit"
            form="group-form"
            disabled={mut.isPending || !name || !sardarPartyId}
            className="min-h-[44px]"
          >
            {mut.isPending ? 'Saving…' : currentGroup ? 'Update Group' : 'Create Group'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
