'use client';

import { useState } from 'react';
import { todayISO } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { messageOf } from '@/features/auth/use-auth';
import { useBrickTypes, useItems, useParties, useWarehouses } from '@/features/masters/hooks';
import { useRecordDrying, useRecordFiring, useRecordMaking, useRecordSorting } from '../hooks';

interface ConsumptionLine {
  itemId: string;
  warehouseId: string;
  quantity: string;
}

/**
 * PRD-04 — raw material used at a stage.
 *
 * Each line becomes a stock OUT in the same transaction as the stage, so if
 * the yard is short the whole stage is refused. That is why the help text
 * warns before saving rather than explaining afterwards.
 */
function ConsumptionRows({
  lines,
  onChange,
  disabled,
  hint,
}: {
  lines: ConsumptionLine[];
  onChange: (next: ConsumptionLine[]) => void;
  disabled: boolean;
  hint: string;
}) {
  const { data: items } = useItems({ limit: 100, isActive: 'true' });
  const { data: warehouses } = useWarehouses({ limit: 100, isActive: 'true' });

  // Only raw materials can be consumed — the API refuses anything else.
  const rawMaterials = items?.items.filter((i) => i.category === 'raw_material') ?? [];

  const update = (index: number, patch: Partial<ConsumptionLine>) =>
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2 rounded-md border border-border p-3">
      <legend className="px-1 text-xs font-medium text-muted-foreground">Materials used</legend>
      <p className="text-xs text-muted-foreground">{hint}</p>

      {lines.map((line, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
          <Select
            id={`consumption-item-${index}`}
            label={index === 0 ? 'Material' : undefined}
            value={line.itemId}
            onChange={(e) => update(index, { itemId: e.target.value })}
          >
            <option value="">Select…</option>
            {rawMaterials.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
          <Select
            id={`consumption-warehouse-${index}`}
            label={index === 0 ? 'From' : undefined}
            value={line.warehouseId}
            onChange={(e) => update(index, { warehouseId: e.target.value })}
          >
            <option value="">Select…</option>
            {warehouses?.items.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <Input
            id={`consumption-qty-${index}`}
            label={index === 0 ? 'Quantity' : undefined}
            inputMode="decimal"
            value={line.quantity}
            placeholder="1000"
            onChange={(e) => update(index, { quantity: e.target.value })}
          />
          <div className="flex items-end pb-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChange(lines.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}

      <div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...lines, { itemId: '', warehouseId: '', quantity: '' }])}
        >
          Add material
        </Button>
      </div>
    </fieldset>
  );
}

/** Lines the user started but left blank should not be sent. */
function usableLines(lines: ConsumptionLine[]): ConsumptionLine[] {
  return lines.filter((l) => l.itemId && l.warehouseId && l.quantity);
}

function StageShell({
  title,
  description,
  formId,
  isPending,
  error,
  children,
  submitLabel,
  disabled,
}: {
  title: string;
  description: string;
  formId: string;
  isPending: boolean;
  error?: string;
  children: React.ReactNode;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <section className="rounded-lg border border-primary/40 bg-surface p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mb-3 mt-0.5 text-xs text-muted-foreground">{description}</p>
      {children}
      {error && (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <Button type="submit" form={formId} disabled={isPending || disabled}>
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </section>
  );
}

export function MakingForm({ batchId }: { batchId: string }) {
  const mutation = useRecordMaking();
  const { data: parties } = useParties({ limit: 100, type: 'sardar' });
  const [entryDate, setEntryDate] = useState(todayISO());
  const [greenBricks, setGreenBricks] = useState('');
  const [sardarPartyId, setSardarPartyId] = useState('');
  const [lines, setLines] = useState<ConsumptionLine[]>([]);

  return (
    <StageShell
      title="1 · Making"
      description="Green bricks moulded by the gang, and the soil used to mould them."
      formId="making-form"
      isPending={mutation.isPending}
      error={mutation.isError ? messageOf(mutation.error) : undefined}
      submitLabel="Record making"
      disabled={!greenBricks}
    >
      <form
        id="making-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({
            batchId,
            dto: {
              entryDate,
              greenBricks,
              sardarPartyId: sardarPartyId || null,
              consumption: usableLines(lines),
            },
          });
        }}
        className="flex flex-col gap-3"
      >
        <fieldset disabled={mutation.isPending} className="flex flex-col gap-3 border-0 p-0">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              id="making-green"
              label="Green bricks *"
              inputMode="numeric"
              required
              placeholder="10000"
              value={greenBricks}
              onChange={(e) => setGreenBricks(e.target.value)}
            />
            <Input
              id="making-date"
              label="Moulded on *"
              type="date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
            <Select
              id="making-sardar"
              label="Sardar"
              value={sardarPartyId}
              onChange={(e) => setSardarPartyId(e.target.value)}
            >
              <option value="">Not recorded</option>
              {parties?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>

          <ConsumptionRows
            lines={lines}
            onChange={setLines}
            disabled={mutation.isPending}
            hint="Taken out of stock when this saves. If the yard is short, nothing is recorded."
          />
        </fieldset>
      </form>
    </StageShell>
  );
}

export function DryingForm({ batchId }: { batchId: string }) {
  const mutation = useRecordDrying();
  const [entryDate, setEntryDate] = useState(todayISO());

  return (
    <StageShell
      title="2 · Drying (optional)"
      description="A date marker, so the owner can see how long drying took. Firing does not wait for it."
      formId="drying-form"
      isPending={mutation.isPending}
      error={mutation.isError ? messageOf(mutation.error) : undefined}
      submitLabel="Record drying"
    >
      <form
        id="drying-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({ batchId, dto: { entryDate } });
        }}
      >
        <Input
          id="drying-date"
          label="Dried on *"
          type="date"
          required
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
        />
      </form>
    </StageShell>
  );
}

export function FiringForm({ batchId }: { batchId: string }) {
  const mutation = useRecordFiring();
  const [entryDate, setEntryDate] = useState(todayISO());
  const [firedBricks, setFiredBricks] = useState('');
  const [lines, setLines] = useState<ConsumptionLine[]>([]);

  return (
    <StageShell
      title="3 · Firing"
      description="Bricks that went into the kiln, and the coal burned to fire them."
      formId="firing-form"
      isPending={mutation.isPending}
      error={mutation.isError ? messageOf(mutation.error) : undefined}
      submitLabel="Record firing"
      disabled={!firedBricks}
    >
      <form
        id="firing-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({
            batchId,
            dto: { entryDate, firedBricks, consumption: usableLines(lines) },
          });
        }}
        className="flex flex-col gap-3"
      >
        <fieldset disabled={mutation.isPending} className="flex flex-col gap-3 border-0 p-0">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="firing-count"
              label="Bricks fired *"
              inputMode="numeric"
              required
              placeholder="9800"
              value={firedBricks}
              onChange={(e) => setFiredBricks(e.target.value)}
            />
            <Input
              id="firing-date"
              label="Fired on *"
              type="date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>

          <ConsumptionRows
            lines={lines}
            onChange={setLines}
            disabled={mutation.isPending}
            hint="The coal booked here drives the fuel-per-1,000 comparison. Leaving it blank is not the same as burning none."
          />
        </fieldset>
      </form>
    </StageShell>
  );
}

export function SortingForm({ batchId }: { batchId: string }) {
  const mutation = useRecordSorting();
  const { data: grades } = useBrickTypes({ limit: 100, isActive: 'true' });
  const { data: warehouses } = useWarehouses({ limit: 100, isActive: 'true' });

  const [entryDate, setEntryDate] = useState(todayISO());
  const [warehouseId, setWarehouseId] = useState('');
  const [brokenBricks, setBrokenBricks] = useState('0');
  const [rejectBricks, setRejectBricks] = useState('0');
  const [outputs, setOutputs] = useState<{ brickTypeId: string; quantity: string }[]>([
    { brickTypeId: '', quantity: '' },
  ]);

  const usable = outputs.filter((o) => o.brickTypeId && o.quantity);
  const update = (index: number, patch: Partial<{ brickTypeId: string; quantity: string }>) =>
    setOutputs(outputs.map((o, i) => (i === index ? { ...o, ...patch } : o)));

  return (
    <StageShell
      title="4 · Sorting"
      description="Good bricks by grade go into finished stock. Broken and rejects are counted, not stocked — they were never in stock to take out of."
      formId="sorting-form"
      isPending={mutation.isPending}
      error={mutation.isError ? messageOf(mutation.error) : undefined}
      submitLabel="Record sorting"
      disabled={usable.length === 0 || !warehouseId}
    >
      <form
        id="sorting-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({
            batchId,
            dto: {
              entryDate,
              warehouseId,
              outputs: usable,
              brokenBricks: brokenBricks || '0',
              rejectBricks: rejectBricks || '0',
            },
          });
        }}
        className="flex flex-col gap-3"
      >
        <fieldset disabled={mutation.isPending} className="flex flex-col gap-3 border-0 p-0">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              id="sorting-warehouse"
              label="Into warehouse *"
              value={warehouseId}
              required
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              <option value="">Select a warehouse…</option>
              {warehouses?.items.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
            <Input
              id="sorting-date"
              label="Sorted on *"
              type="date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>

          <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">Good bricks by grade</legend>
            {outputs.map((o, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Select
                  id={`sorting-grade-${index}`}
                  label={index === 0 ? 'Grade' : undefined}
                  value={o.brickTypeId}
                  onChange={(e) => update(index, { brickTypeId: e.target.value })}
                >
                  <option value="">Select…</option>
                  {grades?.items.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.grade}
                    </option>
                  ))}
                </Select>
                <Input
                  id={`sorting-qty-${index}`}
                  label={index === 0 ? 'Bricks' : undefined}
                  inputMode="numeric"
                  value={o.quantity}
                  placeholder="7000"
                  onChange={(e) => update(index, { quantity: e.target.value })}
                />
                <div className="flex items-end pb-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={outputs.length === 1}
                    onClick={() => setOutputs(outputs.filter((_, i) => i !== index))}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setOutputs([...outputs, { brickTypeId: '', quantity: '' }])}
              >
                Add grade
              </Button>
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="sorting-broken"
              label="Broken"
              inputMode="numeric"
              value={brokenBricks}
              onChange={(e) => setBrokenBricks(e.target.value)}
            />
            <Input
              id="sorting-rejects"
              label="Rejects"
              inputMode="numeric"
              value={rejectBricks}
              onChange={(e) => setRejectBricks(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Recording this closes the batch — a posted stage is corrected by reversal, never edited.
          </p>
        </fieldset>
      </form>
    </StageShell>
  );
}
