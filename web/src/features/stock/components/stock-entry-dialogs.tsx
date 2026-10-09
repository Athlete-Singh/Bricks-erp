'use client';

import { useState } from 'react';
import { todayISO } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { messageOf } from '@/features/auth/use-auth';
import { useWarehouses } from '@/features/masters/hooks';
import { useRecordAdjustment, useRecordOpeningStock } from '../hooks';
import { SubjectPicker, type SubjectValue } from './subject-picker';

function WarehousePicker({
  idPrefix,
  value,
  onChange,
  disabled,
}: {
  /** Unique per dialog — see the note in `SubjectPicker`. */
  idPrefix: string;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const { data, isError } = useWarehouses({ limit: 100, isActive: 'true' });
  return (
    <div className="flex flex-col gap-1">
      <Select
        id={`${idPrefix}-warehouse`}
        label="Warehouse *"
        value={value}
        required
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select a warehouse…</option>
        {data?.items.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </Select>
      {/* An empty dropdown with no explanation looks like "none exist". */}
      {isError && <p className="text-xs text-danger">Could not load warehouses. Try again.</p>}
    </div>
  );
}

/** INV-03 — the balance a kiln starts the year holding. One per thing per place. */
export function OpeningStockDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useRecordOpeningStock();
  const [warehouseId, setWarehouseId] = useState('');
  const [subject, setSubject] = useState<SubjectValue>({ itemId: '', brickTypeId: '' });
  const [quantity, setQuantity] = useState('');
  const [movementDate, setMovementDate] = useState(todayISO());
  const [notes, setNotes] = useState('');

  const close = () => {
    mutation.reset();
    // These dialogs are never unmounted, so nothing clears this for us.
    setWarehouseId('');
    setSubject({ itemId: '', brickTypeId: '' });
    setQuantity('');
    setMovementDate(todayISO());
    setNotes('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(
      {
        warehouseId,
        itemId: subject.itemId || null,
        brickTypeId: subject.brickTypeId || null,
        quantity,
        movementDate,
        notes: notes || null,
      },
      { onSuccess: close },
    );
  };

  const chosen = Boolean(subject.itemId || subject.brickTypeId);

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Opening stock"
      description="What this warehouse already held when the books started"
    >
      <form id="opening-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset disabled={mutation.isPending} className="flex flex-col gap-4 border-0 p-0">
          <WarehousePicker idPrefix="opening" value={warehouseId} onChange={setWarehouseId} />
          <SubjectPicker idPrefix="opening" value={subject} onChange={setSubject} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="opening-quantity"
              label="Quantity *"
              inputMode="decimal"
              required
              placeholder="1000"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <Input
              id="opening-date"
              label="As at *"
              type="date"
              required
              value={movementDate}
              onChange={(e) => setMovementDate(e.target.value)}
            />
          </div>

          <Input id="opening-notes" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <p className="text-xs text-muted-foreground">
            Only one opening figure is allowed per item or grade in a warehouse — a second would double it.
          </p>
        </fieldset>

        {mutation.isError && <Alert variant="error">{messageOf(mutation.error)}</Alert>}
      </form>

      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" form="opening-form" disabled={mutation.isPending || !chosen}>
          {mutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/**
 * INV-06 — a counted correction.
 *
 * This is the one entry that may take a balance below zero, so it asks for a
 * real reason and says plainly that it will be recorded against the user's
 * name. That is the control, not decoration.
 */
export function StockAdjustmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useRecordAdjustment();
  const [warehouseId, setWarehouseId] = useState('');
  const [subject, setSubject] = useState<SubjectValue>({ itemId: '', brickTypeId: '' });
  const [direction, setDirection] = useState<'in' | 'out'>('out');
  const [quantity, setQuantity] = useState('');
  const [movementDate, setMovementDate] = useState(todayISO());
  const [reason, setReason] = useState('');

  const close = () => {
    mutation.reset();
    // Critical here, not merely tidy: an adjustment is the one movement allowed
    // to take a balance below zero, and a form that reopens pre-filled and
    // already valid turns a stray click into a second write-off.
    setWarehouseId('');
    setSubject({ itemId: '', brickTypeId: '' });
    setDirection('out');
    setQuantity('');
    setMovementDate(todayISO());
    setReason('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(
      {
        warehouseId,
        itemId: subject.itemId || null,
        brickTypeId: subject.brickTypeId || null,
        direction,
        quantity,
        movementDate,
        reason,
      },
      { onSuccess: close },
    );
  };

  const chosen = Boolean(subject.itemId || subject.brickTypeId);
  // Mirrors the schema's floor, so the button explains itself before the server does.
  const reasonTooShort = reason.trim().length < 10;

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Adjust stock"
      description="Correct the books against what is actually in the yard"
    >
      <form id="adjust-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset disabled={mutation.isPending} className="flex flex-col gap-4 border-0 p-0">
          <WarehousePicker idPrefix="adjust" value={warehouseId} onChange={setWarehouseId} />
          <SubjectPicker idPrefix="adjust" value={subject} onChange={setSubject} />

          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              id="adjust-direction"
              label="Direction *"
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'in' | 'out')}
            >
              <option value="out">Found less — reduce</option>
              <option value="in">Found more — increase</option>
            </Select>
            <Input
              id="adjust-quantity"
              label="Quantity *"
              inputMode="decimal"
              required
              placeholder="50"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <Input
              id="adjust-date"
              label="Counted on *"
              type="date"
              required
              value={movementDate}
              onChange={(e) => setMovementDate(e.target.value)}
            />
          </div>

          <Input
            id="adjust-reason"
            label="Reason *"
            required
            placeholder="Physical count on 9 Oct found 50 fewer"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <Alert variant="warning">
            This is recorded against your name in the audit log, and it is the only entry allowed to take a balance
            below zero. Say what happened, not just that something changed.
          </Alert>
        </fieldset>

        {mutation.isError && <Alert variant="error">{messageOf(mutation.error)}</Alert>}
      </form>

      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" form="adjust-form" disabled={mutation.isPending || !chosen || reasonTooShort}>
          {mutation.isPending ? 'Saving…' : 'Record adjustment'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
