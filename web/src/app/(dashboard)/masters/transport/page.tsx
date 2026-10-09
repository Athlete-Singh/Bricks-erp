'use client';

import { Truck, Plus } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS } from '@brics/shared';
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
import type { Driver, Vehicle } from '@/features/masters/api';
import {
  useCreateDriver,
  useCreateVehicle,
  useDrivers,
  useUpdateDriver,
  useUpdateVehicle,
  useVehicles,
} from '@/features/masters/hooks';

// ── Drivers ──────────────────────────────────────────────────────────────────

function DriverDialog({ open, driver, onClose }: { open: boolean; driver?: Driver | null; onClose: () => void }) {
  const create = useCreateDriver();
  const update = useUpdateDriver();
  const [name, setName] = useState(driver?.name ?? '');
  const [phone, setPhone] = useState(driver?.phone ?? '');
  const [licenseNo, setLicenseNo] = useState(driver?.licenseNo ?? '');

  const mut = driver ? update : create;
  const isPending = mut.isPending;
  const error = mut.isError ? messageOf(mut.error) : undefined;

  const close = () => {
    mut.reset();
    setName('');
    setPhone('');
    setLicenseNo('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (driver) {
      update.mutate(
        { id: driver.id, dto: { name, phone: phone || null, licenseNo: licenseNo || null } },
        { onSuccess: close },
      );
    } else {
      create.mutate({ name, phone: phone || null, licenseNo: licenseNo || null, isActive: true }, { onSuccess: close });
    }
  };

  return (
    <Dialog open={open} onClose={close} title={driver ? 'Edit driver' : 'Add driver'}>
      <form id="driver-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input id="driver-name" label="Name *" value={name} required onChange={(e) => setName(e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input id="driver-phone" label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input
            id="driver-license"
            label="License No."
            value={licenseNo}
            onChange={(e) => setLicenseNo(e.target.value)}
          />
        </div>
        {error && <Alert variant="error">{error}</Alert>}
      </form>
      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" form="driver-form" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ── Vehicles ─────────────────────────────────────────────────────────────────

const VEHICLE_TYPES = [
  { value: 'truck', label: 'Truck' },
  { value: 'tractor', label: 'Tractor' },
  { value: 'tipper', label: 'Tipper' },
  { value: 'other', label: 'Other' },
];

const OWNER_TYPES = [
  { value: 'own', label: 'Own' },
  { value: 'hired', label: 'Hired' },
];

function VehicleDialog({ open, vehicle, onClose }: { open: boolean; vehicle?: Vehicle | null; onClose: () => void }) {
  const create = useCreateVehicle();
  const update = useUpdateVehicle();
  const [regNo, setRegNo] = useState(vehicle?.registrationNo ?? '');
  const [type, setType] = useState(vehicle?.type ?? 'truck');
  const [ownerType, setOwnerType] = useState(vehicle?.ownerType ?? 'own');

  const mut = vehicle ? update : create;
  const isPending = mut.isPending;
  const error = mut.isError ? messageOf(mut.error) : undefined;

  const close = () => {
    mut.reset();
    setRegNo('');
    setType('truck');
    setOwnerType('own');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (vehicle) {
      update.mutate(
        { id: vehicle.id, dto: { registrationNo: regNo, type: type as never, ownerType: ownerType as never } },
        { onSuccess: close },
      );
    } else {
      create.mutate(
        { registrationNo: regNo, type: type as never, ownerType: ownerType as never, isActive: true },
        { onSuccess: close },
      );
    }
  };

  return (
    <Dialog open={open} onClose={close} title={vehicle ? 'Edit vehicle' : 'Add vehicle'}>
      <form id="vehicle-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="vehicle-reg"
          label="Registration No. *"
          value={regNo}
          required
          placeholder="AB-12-CD-3456"
          onChange={(e) => setRegNo(e.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select id="vehicle-type" label="Type *" value={type} onChange={(e) => setType(e.target.value)}>
            {VEHICLE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Select id="vehicle-owner" label="Ownership" value={ownerType} onChange={(e) => setOwnerType(e.target.value)}>
            {OWNER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        {error && <Alert variant="error">{error}</Alert>}
      </form>
      <DialogFooter>
        <Button variant="ghost" type="button" onClick={close} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" form="vehicle-form" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Section = 'vehicles' | 'drivers';

export default function TransportMastersPage() {
  const { can } = useSession();
  const canManage = can(PERMISSIONS.TRANSPORT_MANAGE);
  const [section, setSection] = useState<Section>('vehicles');

  const [driverPage, setDriverPage] = useState(1);
  const [vehiclePage, setVehiclePage] = useState(1);

  const { data: drivers, isLoading: loadingDrivers } = useDrivers({ page: driverPage, limit: 25 });
  const { data: vehicles, isLoading: loadingVehicles } = useVehicles({ page: vehiclePage, limit: 25 });

  const [driverOpen, setDriverOpen] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);

  const driverCols: Column<Driver>[] = [
    { key: 'name', header: 'Name', render: (d) => <span className="font-medium">{d.name}</span> },
    {
      key: 'phone',
      header: 'Phone',
      hideOnMobile: true,
      render: (d) => d.phone ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'license',
      header: 'License No.',
      hideOnMobile: true,
      render: (d) => d.licenseNo ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (d.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (d: Driver) => (
              <Button size="sm" variant="outline" onClick={() => setEditDriver(d)}>
                Edit
              </Button>
            ),
          } as Column<Driver>,
        ]
      : []),
  ];

  const vehicleCols: Column<Vehicle>[] = [
    {
      key: 'reg',
      header: 'Reg. No.',
      render: (v) => <span className="font-medium font-mono">{v.registrationNo}</span>,
    },
    { key: 'type', header: 'Type', render: (v) => VEHICLE_TYPES.find((t) => t.value === v.type)?.label ?? v.type },
    {
      key: 'owner',
      header: 'Ownership',
      hideOnMobile: true,
      render: (v) => OWNER_TYPES.find((t) => t.value === v.ownerType)?.label ?? v.ownerType,
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => (v.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (v: Vehicle) => (
              <Button size="sm" variant="outline" onClick={() => setEditVehicle(v)}>
                Edit
              </Button>
            ),
          } as Column<Vehicle>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1">
          {(['vehicles', 'drivers'] as Section[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors capitalize ${
                section === s ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {canManage && (
          <Button
            size="sm"
            onClick={() => (section === 'drivers' ? setDriverOpen(true) : setVehicleOpen(true))}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add {section === 'drivers' ? 'driver' : 'vehicle'}
          </Button>
        )}
      </div>

      {section === 'drivers' && (
        <>
          <DataTable
            caption="Drivers"
            columns={driverCols}
            rows={drivers?.items ?? []}
            rowKey={(d) => d.id}
            isLoading={loadingDrivers}
            empty={<EmptyState icon={Truck} title="No drivers" description="Add drivers who operate your vehicles." />}
          />
          {drivers && <Pagination meta={drivers.meta} onPageChange={setDriverPage} />}
        </>
      )}
      {section === 'vehicles' && (
        <>
          <DataTable
            caption="Vehicles"
            columns={vehicleCols}
            rows={vehicles?.items ?? []}
            rowKey={(v) => v.id}
            isLoading={loadingVehicles}
            empty={
              <EmptyState
                icon={Truck}
                title="No vehicles"
                description="Add trucks, tractors and tippers used for dispatch."
              />
            }
          />
          {vehicles && <Pagination meta={vehicles.meta} onPageChange={setVehiclePage} />}
        </>
      )}

      <DriverDialog
        open={driverOpen || !!editDriver}
        driver={editDriver}
        onClose={() => {
          setDriverOpen(false);
          setEditDriver(null);
        }}
      />
      <VehicleDialog
        open={vehicleOpen || !!editVehicle}
        vehicle={editVehicle}
        onClose={() => {
          setVehicleOpen(false);
          setEditVehicle(null);
        }}
      />
    </div>
  );
}
