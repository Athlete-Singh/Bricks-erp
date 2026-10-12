'use client';

import { Fuel, Plus, Route } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS, formatDate, formatINR, todayISO } from '@brics/shared';
import type { VehicleExpenseKind } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/shared/data-table';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { useLedgers } from '@/features/accounting/hooks';
import { useItems, useParties, useVehicles, useDrivers, useWarehouses } from '@/features/masters/hooks';
import type { VehicleExpense, VehicleTrip } from '@/features/dispatch/api';
import {
  useCreateTrip,
  useCreateVehicleExpense,
  useTrips,
  useVehicleExpenses,
} from '@/features/dispatch/hooks';

const KIND_LABEL: Record<VehicleExpenseKind, string> = {
  diesel: 'Diesel',
  maintenance: 'Repairs',
  loading: 'Loading',
  hire: 'Hired vehicle',
};

/** VEH-02…06 — the trip log and what each vehicle cost. */
export default function TripsPage() {
  const { can, sites } = useSession();
  const [tripOpen, setTripOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: trips, isLoading: tripsLoading } = useTrips({ limit: 50 });
  const { data: charges, isLoading: chargesLoading } = useVehicleExpenses({ limit: 50 });
  const { data: vehicles } = useVehicles({ limit: 100 });
  const { data: drivers } = useDrivers({ limit: 100 });
  const { data: customers } = useParties({ limit: 100, type: 'customer' });
  const { data: suppliers } = useParties({ limit: 100, type: 'supplier' });
  const { data: items } = useItems({ limit: 100 });
  const { data: warehouses } = useWarehouses({ limit: 100 });
  const { data: ledgers } = useLedgers();

  const createTrip = useCreateTrip();
  const createCharge = useCreateVehicleExpense();
  const canManage = can(PERMISSIONS.TRANSPORT_MANAGE);

  const [trip, setTrip] = useState({
    vehicleId: '',
    driverId: '',
    siteId: '',
    tripDate: todayISO(),
    routeFrom: '',
    routeTo: '',
    distanceKm: '',
    freightAmount: '',
    freightPartyId: '',
  });

  const [charge, setCharge] = useState({
    vehicleId: '',
    siteId: '',
    kind: 'diesel' as VehicleExpenseKind,
    expenseDate: todayISO(),
    amount: '',
    quantity: '',
    settlement: 'paid' as 'paid' | 'credit' | 'tank',
    paidFromLedgerId: '',
    partyId: '',
    itemId: '',
    warehouseId: '',
    reference: '',
  });

  if (!can(PERMISSIONS.TRANSPORT_VIEW)) {
    return <Alert variant="info">You do not have access to transport.</Alert>;
  }

  const vehicleName = (id: string | null) =>
    vehicles?.items.find((v) => v.id === id)?.registrationNo ?? '—';

  const tripColumns: Column<VehicleTrip>[] = [
    { key: 'no', header: 'Trip', render: (t) => <span className="font-medium">{t.tripNo}</span> },
    { key: 'date', header: 'Date', render: (t) => formatDate(t.tripDate) },
    { key: 'vehicle', header: 'Vehicle', render: (t) => vehicleName(t.vehicleId) },
    {
      key: 'route',
      header: 'Route',
      hideOnMobile: true,
      render: (t) => [t.routeFrom, t.routeTo].filter(Boolean).join(' → ') || '—',
    },
    { key: 'km', header: 'Km', className: 'text-right', hideOnMobile: true, render: (t) => t.distanceKm ?? '—' },
    {
      key: 'freight',
      header: 'Freight charged',
      className: 'text-right',
      render: (t) =>
        t.freightAmount ? (
          formatINR(t.freightAmount)
        ) : (
          <span className="text-xs text-muted-foreground">on the invoice</span>
        ),
    },
  ];

  const chargeColumns: Column<VehicleExpense>[] = [
    { key: 'date', header: 'Date', render: (e) => formatDate(e.expenseDate) },
    { key: 'vehicle', header: 'Vehicle', render: (e) => vehicleName(e.vehicleId) },
    { key: 'kind', header: 'Charge', render: (e) => <Badge variant="muted">{KIND_LABEL[e.kind]}</Badge> },
    { key: 'qty', header: 'Litres', className: 'text-right', hideOnMobile: true, render: (e) => e.quantity ?? '—' },
    { key: 'amount', header: 'Amount', className: 'text-right', render: (e) => formatINR(e.amount) },
    {
      key: 'how',
      header: 'Settled',
      render: (e) =>
        e.stockMovementId ? (
          // ADR-043: it was already paid for on the purchase bill.
          <Badge variant="muted">from the tank</Badge>
        ) : e.paidFromLedgerId ? (
          <Badge variant="success">paid</Badge>
        ) : (
          <Badge variant="warning">owed</Badge>
        ),
    },
  ];

  const submitTrip = async () => {
    setError(null);
    try {
      await createTrip.mutateAsync({
        vehicleId: trip.vehicleId,
        driverId: trip.driverId || null,
        siteId: trip.siteId,
        tripDate: trip.tripDate,
        routeFrom: trip.routeFrom || null,
        routeTo: trip.routeTo || null,
        distanceKm: trip.distanceKm || null,
        freightAmount: trip.freightAmount || null,
        freightPartyId: trip.freightAmount ? trip.freightPartyId : null,
      });
      setTripOpen(false);
    } catch (err) {
      setError(messageOf(err));
    }
  };

  const submitCharge = async () => {
    setError(null);
    const fromTank = charge.settlement === 'tank';
    try {
      await createCharge.mutateAsync({
        vehicleId: charge.vehicleId,
        siteId: charge.siteId,
        kind: charge.kind,
        expenseDate: charge.expenseDate,
        amount: charge.amount,
        quantity: charge.quantity || null,
        paidFromLedgerId: charge.settlement === 'paid' ? charge.paidFromLedgerId : null,
        partyId: charge.settlement === 'credit' ? charge.partyId : null,
        itemId: fromTank ? charge.itemId : null,
        warehouseId: fromTank ? charge.warehouseId : null,
        reference: charge.reference || null,
      });
      setChargeOpen(false);
    } catch (err) {
      setError(messageOf(err));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {error && <Alert variant="error">{error}</Alert>}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Trips</h2>
          {canManage && (
            <Button size="sm" onClick={() => setTripOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden /> Log a trip
            </Button>
          )}
        </div>
        <DataTable
          columns={tripColumns}
          rows={trips?.items ?? []}
          rowKey={(t) => t.id}
          isLoading={tripsLoading}
          caption="Trip log"
          empty={<EmptyState icon={Route} title="No trips logged" description="Log a run to track what it earned." />}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Vehicle charges</h2>
          {canManage && (
            <Button size="sm" onClick={() => setChargeOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden /> Add a charge
            </Button>
          )}
        </div>
        <DataTable
          columns={chargeColumns}
          rows={charges?.items ?? []}
          rowKey={(e) => e.id}
          isLoading={chargesLoading}
          caption="Vehicle charges"
          empty={
            <EmptyState icon={Fuel} title="No charges yet" description="Diesel, repairs, loading fees and hire." />
          }
        />
      </section>

      <Dialog open={tripOpen} onClose={() => setTripOpen(false)} title="Log a trip">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Vehicle"
              value={trip.vehicleId}
              onChange={(e) => setTrip((t) => ({ ...t, vehicleId: e.target.value }))}
              required
            >
              <option value="">Select</option>
              {vehicles?.items.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNo}
                </option>
              ))}
            </Select>
            <Select
              label="Driver"
              value={trip.driverId}
              onChange={(e) => setTrip((t) => ({ ...t, driverId: e.target.value }))}
            >
              <option value="">Not recorded</option>
              {drivers?.items.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Kiln"
              value={trip.siteId}
              onChange={(e) => setTrip((t) => ({ ...t, siteId: e.target.value }))}
              required
            >
              <option value="">Select</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Input
              label="Date"
              type="date"
              value={trip.tripDate}
              onChange={(e) => setTrip((t) => ({ ...t, tripDate: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="From"
              value={trip.routeFrom}
              onChange={(e) => setTrip((t) => ({ ...t, routeFrom: e.target.value }))}
            />
            <Input
              label="To"
              value={trip.routeTo}
              onChange={(e) => setTrip((t) => ({ ...t, routeTo: e.target.value }))}
            />
            <Input
              label="Km"
              inputMode="decimal"
              value={trip.distanceKm}
              onChange={(e) => setTrip((t) => ({ ...t, distanceKm: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Freight charged"
              inputMode="decimal"
              value={trip.freightAmount}
              onChange={(e) => setTrip((t) => ({ ...t, freightAmount: e.target.value }))}
            />
            <Select
              label="Charged to"
              value={trip.freightPartyId}
              onChange={(e) => setTrip((t) => ({ ...t, freightPartyId: e.target.value }))}
              disabled={trip.freightAmount === ''}
            >
              <option value="">Select</option>
              {customers?.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave the freight blank when the invoice for this load already charges transport — the income is booked
            there, and booking it twice would overstate what the kiln earned.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTripOpen(false)}>
              Close
            </Button>
            <Button onClick={() => void submitTrip()} disabled={createTrip.isPending}>
              Log trip
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={chargeOpen} onClose={() => setChargeOpen(false)} title="Vehicle charge">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Vehicle"
              value={charge.vehicleId}
              onChange={(e) => setCharge((c) => ({ ...c, vehicleId: e.target.value }))}
              required
            >
              <option value="">Select</option>
              {vehicles?.items.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNo}
                </option>
              ))}
            </Select>
            <Select
              label="Charge"
              value={charge.kind}
              onChange={(e) =>
                setCharge((c) => ({
                  ...c,
                  kind: e.target.value as VehicleExpenseKind,
                  // Only diesel can come out of a yard.
                  settlement: e.target.value === 'diesel' ? c.settlement : c.settlement === 'tank' ? 'paid' : c.settlement,
                }))
              }
            >
              {(Object.keys(KIND_LABEL) as VehicleExpenseKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Kiln"
              value={charge.siteId}
              onChange={(e) => setCharge((c) => ({ ...c, siteId: e.target.value }))}
              required
            >
              <option value="">Select</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Input
              label="Date"
              type="date"
              value={charge.expenseDate}
              onChange={(e) => setCharge((c) => ({ ...c, expenseDate: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Amount"
              inputMode="decimal"
              value={charge.amount}
              onChange={(e) => setCharge((c) => ({ ...c, amount: e.target.value }))}
              required
            />
            <Input
              label="Litres"
              inputMode="decimal"
              value={charge.quantity}
              onChange={(e) => setCharge((c) => ({ ...c, quantity: e.target.value }))}
              disabled={charge.kind !== 'diesel'}
            />
          </div>

          <Select
            label="How it was settled"
            value={charge.settlement}
            onChange={(e) => setCharge((c) => ({ ...c, settlement: e.target.value as typeof c.settlement }))}
          >
            <option value="paid">Paid now, from cash or bank</option>
            <option value="credit">Owed — a bill to settle later</option>
            {charge.kind === 'diesel' && <option value="tank">Issued from our own fuel store</option>}
          </Select>

          {charge.settlement === 'paid' && (
            <Select
              label="Paid from"
              value={charge.paidFromLedgerId}
              onChange={(e) => setCharge((c) => ({ ...c, paidFromLedgerId: e.target.value }))}
              required
            >
              <option value="">Select</option>
              {ledgers?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          )}

          {charge.settlement === 'credit' && (
            <Select
              label="Owed to"
              value={charge.partyId}
              onChange={(e) => setCharge((c) => ({ ...c, partyId: e.target.value }))}
              required
            >
              <option value="">Select</option>
              {suppliers?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          )}

          {charge.settlement === 'tank' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Fuel"
                  value={charge.itemId}
                  onChange={(e) => setCharge((c) => ({ ...c, itemId: e.target.value }))}
                  required
                >
                  <option value="">Select</option>
                  {items?.items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="From yard"
                  value={charge.warehouseId}
                  onChange={(e) => setCharge((c) => ({ ...c, warehouseId: e.target.value }))}
                  required
                >
                  <option value="">Select</option>
                  {warehouses?.items.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                This fuel was already paid for on its purchase bill, so issuing it only takes it out of stock — no
                second charge goes to the books.
              </p>
            </>
          )}

          <Input
            label="Reference"
            value={charge.reference}
            onChange={(e) => setCharge((c) => ({ ...c, reference: e.target.value }))}
          />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setChargeOpen(false)}>
              Close
            </Button>
            <Button onClick={() => void submitCharge()} disabled={createCharge.isPending}>
              Save charge
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
