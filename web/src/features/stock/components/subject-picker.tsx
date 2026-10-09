'use client';

import { Select } from '@/components/ui/select';
import { useBrickTypes, useItems } from '@/features/masters/hooks';

export interface SubjectValue {
  itemId: string;
  brickTypeId: string;
}

/**
 * Picks *one* of an item or a brick grade — the API refuses both (ADR-023), so
 * choosing one here clears the other rather than letting the form submit
 * something the backend is certain to reject.
 */
export function SubjectPicker({
  idPrefix,
  value,
  onChange,
  disabled,
}: {
  /**
   * Both stock dialogs are mounted at once, so a fixed id would appear twice in
   * the DOM and every `<label for>` would point at the first one — clicking the
   * adjustment's "Item" label focused the opening form's field instead.
   */
  idPrefix: string;
  value: SubjectValue;
  onChange: (next: SubjectValue) => void;
  disabled?: boolean;
}) {
  // Pickers need the whole list, not a table page.
  const { data: items, isError: itemsFailed } = useItems({ limit: 100, isActive: 'true' });
  const { data: grades, isError: gradesFailed } = useBrickTypes({ limit: 100, isActive: 'true' });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select
        id={`${idPrefix}-item`}
        label="Item"
        value={value.itemId}
        disabled={disabled}
        onChange={(e) => onChange({ itemId: e.target.value, brickTypeId: '' })}
      >
        <option value="">Not an item…</option>
        {items?.items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>

      <Select
        id={`${idPrefix}-brick-type`}
        label="Brick grade"
        value={value.brickTypeId}
        disabled={disabled}
        onChange={(e) => onChange({ itemId: '', brickTypeId: e.target.value })}
      >
        <option value="">Not a grade…</option>
        {grades?.items.map((grade) => (
          <option key={grade.id} value={grade.id}>
            {grade.grade}
          </option>
        ))}
      </Select>

      {(itemsFailed || gradesFailed) && (
        <p className="text-xs text-danger sm:col-span-2">
          Could not load{' '}
          {itemsFailed && gradesFailed ? 'items or brick grades' : itemsFailed ? 'items' : 'brick grades'}. Try again.
        </p>
      )}
    </div>
  );
}
