'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { fieldErrorsOf, messageOf } from '@/features/auth/use-auth';
import type { Worker } from '@/features/labour/api';
import { useCreateWorker, useLabourGroups, useUpdateWorker } from '@/features/labour/hooks';

export interface WorkerDialogProps {
  open: boolean;
  onClose: () => void;
  initial?: Worker | null;
  /** Backwards compatibility alias for initial */
  worker?: Worker | null;
  defaultGroupId?: string;
  /** Backwards compatibility alias for defaultGroupId */
  initialGroupId?: string;
}

export function WorkerDialog({ open, onClose, initial, worker, defaultGroupId, initialGroupId }: WorkerDialogProps) {
  const currentWorker = initial ?? worker;
  const effectiveGroupId = defaultGroupId ?? initialGroupId ?? '';
  const [labourGroupId, setLabourGroupId] = useState(effectiveGroupId);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dailyWageRate, setDailyWageRate] = useState('');
  const [isActive, setIsActive] = useState(true);

  const { data: groups, isLoading: loadingGroups } = useLabourGroups();
  const create = useCreateWorker();
  const update = useUpdateWorker();
  const mut = currentWorker ? update : create;

  const serverFieldErrors = fieldErrorsOf(mut.error);
  const generalError = mut.isError && Object.keys(serverFieldErrors).length === 0;

  useEffect(() => {
    if (currentWorker) {
      setLabourGroupId(currentWorker.labourGroupId);
      setName(currentWorker.name);
      setPhone(currentWorker.phone ?? '');
      setDailyWageRate(currentWorker.dailyWageRate ?? '');
      setIsActive(currentWorker.isActive);
    } else {
      setLabourGroupId(effectiveGroupId);
      setName('');
      setPhone('');
      setDailyWageRate('');
      setIsActive(true);
    }
  }, [currentWorker, effectiveGroupId, open]);

  const close = () => {
    mut.reset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labourGroupId || !name.trim()) return;

    if (currentWorker) {
      update.mutate(
        {
          id: currentWorker.id,
          dto: {
            labourGroupId,
            name: name.trim(),
            phone: phone.trim() ? phone.trim() : null,
            dailyWageRate: dailyWageRate.trim() ? dailyWageRate.trim() : null,
            isActive,
          },
        },
        { onSuccess: close },
      );
    } else {
      create.mutate(
        {
          labourGroupId,
          name: name.trim(),
          phone: phone.trim() ? phone.trim() : null,
          dailyWageRate: dailyWageRate.trim() ? dailyWageRate.trim() : null,
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
      title={currentWorker ? 'Edit Worker' : 'Add Worker (LAB-01)'}
      description="Register an individual worker assigned to a Sardar's labour group."
    >
      <form id="worker-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {generalError && <Alert variant="error">{messageOf(mut.error, 'Could not save worker')}</Alert>}

        <fieldset disabled={mut.isPending} className="flex flex-col gap-4 border-0 p-0">
          <Select
            id="worker-group"
            label="Labour Group *"
            value={labourGroupId}
            required
            disabled={loadingGroups}
            error={serverFieldErrors.labourGroupId}
            onChange={(e) => setLabourGroupId(e.target.value)}
          >
            <option value="">{loadingGroups ? 'Loading groups…' : 'Select labour group…'}</option>
            {groups?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.sardarParty?.name ?? 'Sardar'})
              </option>
            ))}
          </Select>

          <Input
            id="worker-name"
            label="Worker Name *"
            placeholder="e.g. Raju Kumar"
            required
            value={name}
            error={serverFieldErrors.name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="worker-phone"
              label="Phone Number"
              inputMode="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              error={serverFieldErrors.phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Input
              id="worker-wage-rate"
              label="Daily Wage Rate (₹)"
              inputMode="decimal"
              placeholder="e.g. 450.00"
              value={dailyWageRate}
              error={serverFieldErrors.dailyWageRate}
              onChange={(e) => setDailyWageRate(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span>Active worker</span>
          </label>
        </fieldset>

        <DialogFooter>
          <Button variant="ghost" type="button" onClick={close} disabled={mut.isPending} className="min-h-[44px]">
            Cancel
          </Button>
          <Button
            type="submit"
            form="worker-form"
            disabled={mut.isPending || !labourGroupId || !name.trim()}
            className="min-h-[44px]"
          >
            {mut.isPending ? 'Saving…' : currentWorker ? 'Update Worker' : 'Add Worker'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
