'use client';

import { BoxIcon, Plus } from 'lucide-react';
import { useState } from 'react';
import type { CreateItemInput } from '@brics/shared';
import { ITEM_CATEGORIES, PERMISSIONS } from '@brics/shared';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Pagination } from '@/components/shared/pagination';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { messageOf, useSession } from '@/features/auth/use-auth';
import type { BrickType, Item, Unit, Warehouse } from '@/features/masters/api';
import {
  useBrickTypes,
  useCreateBrickType,
  useCreateItem,
  useCreateUnit,
  useCreateWarehouse,
  useItems,
  useUnits,
  useUpdateBrickType,
  useUpdateItem,
  useUpdateUnit,
  useUpdateWarehouse,
  useWarehouses,
} from '@/features/masters/hooks';
import { useSites } from '@/features/company/hooks';

// ── Category labels ─────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  raw_material: 'Raw Material',
  consumable: 'Consumable',
  machinery: 'Machinery',
  electrical: 'Electrical',
  repair: 'Repair',
  other: 'Other',
};

// ── Units ────────────────────────────────────────────────────────────────────

function UnitDialog({ open, unit, onClose }: { open: boolean; unit?: Unit | null; onClose: () => void }) {
  const create = useCreateUnit();
  const update = useUpdateUnit();
  const [name, setName] = useState(unit?.name ?? '');
  const [abbreviation, setAbbreviation] = useState((unit as Unit & { abbreviation?: string })?.abbreviation ?? '');

  const mut = unit ? update : create;
  const isPending = mut.isPending;
  const error = mut.isError ? messageOf(mut.error) : undefined;

  const close = () => {
    mut.reset();
    setName('');
    setAbbreviation('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (unit) {
      update.mutate({ id: unit.id, dto: { name, isActive: true } }, { onSuccess: close });
    } else {
      create.mutate({ name, abbreviation }, { onSuccess: close });
    }
  };

  return (
    <Dialog open={open} onClose={close} title={unit ? 'Edit unit' : 'Add unit'}>
      <form id="unit-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input id="unit-name" label="Name *" value={name} required onChange={(e) => setName(e.target.value)} />
        {!unit && (
          <Input
            id="unit-abbreviation"
            label="Abbreviation *"
            value={abbreviation}
            placeholder="e.g. kg, bag, nos"
            required
            onChange={(e) => setAbbreviation(e.target.value)}
          />
        )}
        {error && <Alert variant="error">{error}</Alert>}
      </form>
      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" form="unit-form" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ── Brick Types ──────────────────────────────────────────────────────────────

function BrickTypeDialog({
  open,
  brickType,
  onClose,
}: {
  open: boolean;
  brickType?: BrickType | null;
  onClose: () => void;
}) {
  const create = useCreateBrickType();
  const update = useUpdateBrickType();
  const [grade, setGrade] = useState(brickType?.grade ?? '');
  const [description, setDescription] = useState(brickType?.description ?? '');

  const mut = brickType ? update : create;
  const isPending = mut.isPending;
  const error = mut.isError ? messageOf(mut.error) : undefined;

  const close = () => {
    mut.reset();
    setGrade('');
    setDescription('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (brickType) {
      update.mutate({ id: brickType.id, dto: { grade, description: description || null } }, { onSuccess: close });
    } else {
      create.mutate({ grade, description: description || null }, { onSuccess: close });
    }
  };

  return (
    <Dialog open={open} onClose={close} title={brickType ? 'Edit brick type' : 'Add brick type'}>
      <form id="brick-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="brick-grade"
          label="Grade *"
          value={grade}
          required
          placeholder="Class 1"
          onChange={(e) => setGrade(e.target.value)}
        />
        <Input
          id="brick-desc"
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {error && <Alert variant="error">{error}</Alert>}
      </form>
      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" form="brick-form" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ── Warehouses ───────────────────────────────────────────────────────────────

function WarehouseDialog({
  open,
  warehouse,
  onClose,
}: {
  open: boolean;
  warehouse?: Warehouse | null;
  onClose: () => void;
}) {
  const create = useCreateWarehouse();
  const update = useUpdateWarehouse();
  const { data: sites } = useSites();
  const [name, setName] = useState(warehouse?.name ?? '');
  const [siteId, setSiteId] = useState(warehouse?.siteId ?? '');

  const mut = warehouse ? update : create;
  const isPending = mut.isPending;
  const error = mut.isError ? messageOf(mut.error) : undefined;

  const close = () => {
    mut.reset();
    setName('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (warehouse) {
      update.mutate({ id: warehouse.id, dto: { name } }, { onSuccess: close });
    } else {
      create.mutate({ name, siteId }, { onSuccess: close });
    }
  };

  return (
    <Dialog open={open} onClose={close} title={warehouse ? 'Edit warehouse' : 'Add warehouse'}>
      <form id="warehouse-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input id="wh-name" label="Name *" value={name} required onChange={(e) => setName(e.target.value)} />
        {!warehouse && (
          <Select
            id="wh-site"
            label="Kiln / site *"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            required
          >
            <option value="">Select kiln…</option>
            {sites?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
        {error && <Alert variant="error">{error}</Alert>}
      </form>
      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" form="warehouse-form" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ── Items ────────────────────────────────────────────────────────────────────

function ItemDialog({ open, item, onClose }: { open: boolean; item?: Item | null; onClose: () => void }) {
  const create = useCreateItem();
  const update = useUpdateItem();
  // A picker needs the whole list, not a table page.
  const { data: units } = useUnits({ limit: 100 });
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState<string>(item?.category ?? '');
  const [unitId, setUnitId] = useState(item?.unitId ?? '');

  const mut = item ? update : create;
  const isPending = mut.isPending;
  const error = mut.isError ? messageOf(mut.error) : undefined;

  const close = () => {
    mut.reset();
    setName('');
    setCategory('');
    setUnitId('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (item) {
      update.mutate(
        { id: item.id, dto: { name, category: category as CreateItemInput['category'], unitId } },
        { onSuccess: close },
      );
    } else {
      create.mutate(
        { name, category: category as CreateItemInput['category'], unitId, hsnId: null },
        { onSuccess: close },
      );
    }
  };

  return (
    <Dialog open={open} onClose={close} title={item ? 'Edit item' : 'Add item'}>
      <form id="item-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input id="item-name" label="Name *" value={name} required onChange={(e) => setName(e.target.value)} />
        <Select
          id="item-category"
          label="Category *"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="">Select category…</option>
          {ITEM_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
        <Select id="item-unit" label="Unit *" value={unitId} onChange={(e) => setUnitId(e.target.value)} required>
          <option value="">Select unit…</option>
          {units?.items.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        {error && <Alert variant="error">{error}</Alert>}
      </form>
      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" form="item-form" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Section = 'units' | 'brick-types' | 'warehouses' | 'items';

export default function InventoryMastersPage() {
  const { can } = useSession();
  const canManage = can(PERMISSIONS.INVENTORY_MANAGE);
  const [section, setSection] = useState<Section>('items');
  // One page cursor, reset whenever the sub-tab changes — page 3 of Units is
  // meaningless once you switch to Items.
  const [page, setPage] = useState(1);
  const showSection = (next: Section) => {
    setSection(next);
    setPage(1);
  };

  const { data: units, isLoading: loadingUnits } = useUnits({ page, limit: 25 });
  const { data: brickTypes, isLoading: loadingBrick } = useBrickTypes({ page, limit: 25 });
  const { data: warehouses, isLoading: loadingWh } = useWarehouses({ page, limit: 25 });
  const { data: items, isLoading: loadingItems } = useItems({ page, limit: 25 });

  // dialogs
  const [unitOpen, setUnitOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [brickOpen, setBrickOpen] = useState(false);
  const [editBrick, setEditBrick] = useState<BrickType | null>(null);
  const [whOpen, setWhOpen] = useState(false);
  const [editWh, setEditWh] = useState<Warehouse | null>(null);
  const [itemOpen, setItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);

  const unitCols: Column<Unit>[] = [
    { key: 'name', header: 'Name', render: (u) => <span className="font-medium">{u.name}</span> },
    { key: 'symbol', header: 'Symbol / Abbr.', render: (u) => u.abbreviation ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (u.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (u: Unit) => (
              <Button size="sm" variant="outline" onClick={() => setEditUnit(u)}>
                Edit
              </Button>
            ),
          } as Column<Unit>,
        ]
      : []),
  ];

  const brickCols: Column<BrickType>[] = [
    { key: 'grade', header: 'Grade', render: (b) => <span className="font-medium">{b.grade}</span> },
    {
      key: 'desc',
      header: 'Description',
      hideOnMobile: true,
      render: (b) => b.description ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => (b.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (b: BrickType) => (
              <Button size="sm" variant="outline" onClick={() => setEditBrick(b)}>
                Edit
              </Button>
            ),
          } as Column<BrickType>,
        ]
      : []),
  ];

  const whCols: Column<Warehouse>[] = [
    { key: 'name', header: 'Name', render: (w) => <span className="font-medium">{w.name}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (w) => (w.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (w: Warehouse) => (
              <Button size="sm" variant="outline" onClick={() => setEditWh(w)}>
                Edit
              </Button>
            ),
          } as Column<Warehouse>,
        ]
      : []),
  ];

  const itemCols: Column<Item>[] = [
    { key: 'name', header: 'Item', render: (i) => <span className="font-medium">{i.name}</span> },
    { key: 'cat', header: 'Category', render: (i) => CATEGORY_LABELS[i.category] ?? i.category },
    {
      key: 'hsn',
      header: 'HSN',
      hideOnMobile: true,
      render: (i) => i.hsnId ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (i) => (i.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (i: Item) => (
              <Button size="sm" variant="outline" onClick={() => setEditItem(i)}>
                Edit
              </Button>
            ),
          } as Column<Item>,
        ]
      : []),
  ];

  const SECTIONS: { key: Section; label: string }[] = [
    { key: 'items', label: 'Items' },
    { key: 'units', label: 'Units' },
    { key: 'brick-types', label: 'Brick Types' },
    { key: 'warehouses', label: 'Warehouses' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-tabs */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => showSection(s.key)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                section === s.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {canManage && (
          <Button
            size="sm"
            onClick={() => {
              if (section === 'units') setUnitOpen(true);
              else if (section === 'brick-types') setBrickOpen(true);
              else if (section === 'warehouses') setWhOpen(true);
              else setItemOpen(true);
            }}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden /> Add
          </Button>
        )}
      </div>

      {section === 'units' && (
        <>
          <DataTable
            caption="Units"
            columns={unitCols}
            rows={units?.items ?? []}
            rowKey={(u) => u.id}
            isLoading={loadingUnits}
            empty={
              <EmptyState icon={BoxIcon} title="No units" description="Add measurement units like bags, kg or nos." />
            }
          />
          {units && <Pagination meta={units.meta} onPageChange={setPage} />}
        </>
      )}
      {section === 'brick-types' && (
        <>
          <DataTable
            caption="Brick types"
            columns={brickCols}
            rows={brickTypes?.items ?? []}
            rowKey={(b) => b.id}
            isLoading={loadingBrick}
            empty={
              <EmptyState
                icon={BoxIcon}
                title="No brick types"
                description="Add grades like Class 1, Class 2 or Jhama."
              />
            }
          />
          {brickTypes && <Pagination meta={brickTypes.meta} onPageChange={setPage} />}
        </>
      )}
      {section === 'warehouses' && (
        <>
          <DataTable
            caption="Warehouses"
            columns={whCols}
            rows={warehouses?.items ?? []}
            rowKey={(w) => w.id}
            isLoading={loadingWh}
            empty={
              <EmptyState
                icon={BoxIcon}
                title="No warehouses"
                description="Add stock locations like Finished Goods Yard or Raw Material Store."
              />
            }
          />
          {warehouses && <Pagination meta={warehouses.meta} onPageChange={setPage} />}
        </>
      )}
      {section === 'items' && (
        <>
          <DataTable
            caption="Items"
            columns={itemCols}
            rows={items?.items ?? []}
            rowKey={(i) => i.id}
            isLoading={loadingItems}
            empty={
              <EmptyState
                icon={BoxIcon}
                title="No items"
                description="Add raw materials, coal, diesel and consumables."
              />
            }
          />
          {items && <Pagination meta={items.meta} onPageChange={setPage} />}
        </>
      )}

      <UnitDialog
        open={unitOpen || !!editUnit}
        unit={editUnit}
        onClose={() => {
          setUnitOpen(false);
          setEditUnit(null);
        }}
      />
      <BrickTypeDialog
        open={brickOpen || !!editBrick}
        brickType={editBrick}
        onClose={() => {
          setBrickOpen(false);
          setEditBrick(null);
        }}
      />
      <WarehouseDialog
        open={whOpen || !!editWh}
        warehouse={editWh}
        onClose={() => {
          setWhOpen(false);
          setEditWh(null);
        }}
      />
      <ItemDialog
        open={itemOpen || !!editItem}
        item={editItem}
        onClose={() => {
          setItemOpen(false);
          setEditItem(null);
        }}
      />
    </div>
  );
}
