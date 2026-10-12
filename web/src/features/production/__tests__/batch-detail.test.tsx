import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BatchDetailPage from '@/app/(dashboard)/production/batches/[id]/page';
import type { BatchDetail, ProductionEntry } from '../api';

const makingEntry: ProductionEntry = {
  id: 'e-making',
  batchId: 'b1',
  stage: 'making',
  entryDate: '2026-10-01',
  greenBricks: '10000.000',
  firedBricks: '0.000',
  brokenBricks: '0.000',
  rejectBricks: '0.000',
  sardarPartyId: null,
  warehouseId: null,
  notes: null,
};

const firingEntry: ProductionEntry = {
  ...makingEntry,
  id: 'e-firing',
  stage: 'firing',
  entryDate: '2026-10-04',
  greenBricks: '0.000',
  firedBricks: '9800.000',
};

const baseDetail: BatchDetail = {
  batch: {
    id: 'b1',
    siteId: 's1',
    chamber: 'Chamber 1',
    batchDate: '2026-10-01',
    status: 'open',
    notes: null,
  },
  entries: [],
  outputs: [],
  consumptions: [],
};

const detailRef: { current: BatchDetail } = { current: baseDetail };

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'b1' }),
}));

vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return {
    ...actual,
    useSession: () => ({ can: () => true, sites: [{ id: 's1', name: 'Kiln One' }] }),
    messageOf: (e: unknown, fallback = '') => (e instanceof Error ? e.message : fallback),
  };
});

vi.mock('@/features/masters/hooks', () => ({
  useBrickTypes: () => ({ data: { items: [] } }),
  useItems: () => ({ data: { items: [] } }),
  useParties: () => ({ data: { items: [] } }),
  useWarehouses: () => ({ data: { items: [] } }),
}));

vi.mock('../api', () => ({
  fetchBatch: () => Promise.resolve(detailRef.current),
}));

async function renderWith(detail: BatchDetail) {
  detailRef.current = detail;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <BatchDetailPage />
    </QueryClientProvider>,
  );
  await screen.findByText(/Chamber 1/);
}

describe('Batch detail — the stage slot', () => {
  it('shows the Making form when nothing has been recorded yet', async () => {
    await renderWith({ ...baseDetail, entries: [] });
    expect(screen.getByRole('button', { name: /Record making/ })).toBeInTheDocument();
  });

  it('marks drying as skipped once firing is in, so the timeline is not silently missing a stage', async () => {
    await renderWith({ ...baseDetail, entries: [makingEntry, firingEntry] });
    expect(screen.getByText(/2 · Drying/)).toBeInTheDocument();
    expect(screen.getByText(/skipped/i)).toBeInTheDocument();
    // No drying form is offered after firing lands.
    expect(screen.queryByRole('button', { name: /Record drying/ })).not.toBeInTheDocument();
  });

  it('offers the drying form only before firing is recorded', async () => {
    await renderWith({ ...baseDetail, entries: [makingEntry] });
    expect(screen.getByRole('button', { name: /Record drying/ })).toBeInTheDocument();
    expect(screen.queryByText(/skipped/i)).not.toBeInTheDocument();
  });
});
