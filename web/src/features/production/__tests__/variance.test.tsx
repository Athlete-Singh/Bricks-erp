import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VariancePage from '@/app/(dashboard)/production/variance/page';
import type { FuelVarianceRow, YieldVarianceRow } from '../api';

const yieldRows: YieldVarianceRow[] = [];
const fuelRows: FuelVarianceRow[] = [];

vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return { ...actual, useSession: () => ({ can: () => true, sites: [{ id: 's1', name: 'Kiln One' }] }) };
});

vi.mock('@/features/masters/hooks', () => ({
  useItems: () => ({ data: { items: [{ id: 'coal', name: 'Coal', category: 'raw_material' }] } }),
}));

vi.mock('../api', () => ({
  fetchYieldVariance: () => Promise.resolve(yieldRows),
  fetchFuelVariance: () => Promise.resolve(fuelRows),
}));

function yieldRow(overrides: Partial<YieldVarianceRow> = {}): YieldVarianceRow {
  return {
    groupId: 'b1',
    groupLabel: 'Chamber 1 · 2026-10-01',
    siteId: 's1',
    chamber: 'Chamber 1',
    sardarPartyId: null,
    greenMoulded: '10000.000',
    fired: '9800.000',
    goodTotal: '9500.000',
    broken: '200.000',
    rejects: '100.000',
    unexplained: '200.000',
    sortingComplete: true,
    batchCount: 1,
    pendingSortCount: 0,
    preFiringLoss: '200.000',
    postFiringLoss: '0.000',
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <VariancePage />
    </QueryClientProvider>,
  );
}

/**
 * The leakage report is the product's return-on-investment claim, and the
 * defect it shipped with was not arithmetic — it was what a row *meant* while
 * the batch was still in the kiln. These guard the meaning.
 */
describe('Yield variance', () => {
  it('says "not known yet" for an unsorted batch, never a loss figure', async () => {
    // Before the repair this row reported the entire output as unaccounted
    // for, because good/broken/rejects are zero until somebody sorts it.
    yieldRows.length = 0;
    yieldRows.push(
      yieldRow({
        groupLabel: 'Chamber 2 · 2026-10-05',
        goodTotal: '0.000',
        broken: '0.000',
        rejects: '0.000',
        unexplained: null,
        postFiringLoss: null,
        sortingComplete: false,
        pendingSortCount: 1,
      }),
    );

    renderPage();

    expect(await screen.findByText('Not known yet')).toBeInTheDocument();
    expect(screen.getByText('Not sorted yet')).toBeInTheDocument();
    // And it must not quietly render the moulded count as a loss.
    expect(screen.queryByText('All accounted for')).not.toBeInTheDocument();
  });

  it('explains why a figure is missing rather than leaving a blank cell', async () => {
    yieldRows.length = 0;
    yieldRows.push(yieldRow({ unexplained: null, postFiringLoss: null, sortingComplete: false, pendingSortCount: 1 }));

    renderPage();

    expect(await screen.findByText(/still waiting to be sorted/)).toBeInTheDocument();
  });

  it('separates ordinary drying loss from bricks missing after firing', async () => {
    // 10,000 moulded, 9,800 fired, all 9,800 accounted for: the 200 went in
    // the drying shed and there is no theft signal at all.
    yieldRows.length = 0;
    yieldRows.push(yieldRow());

    renderPage();

    expect(await screen.findByText('All accounted for')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('shows a real post-firing loss in the danger colour', async () => {
    yieldRows.length = 0;
    yieldRows.push(yieldRow({ goodTotal: '9000.000', postFiringLoss: '500.000', unexplained: '700.000' }));

    renderPage();

    const loss = await screen.findByText('500');
    expect(loss).toHaveClass('text-danger');
  });
});

describe('Fuel variance', () => {
  it('asks for a fuel before showing anything, since the API requires one', async () => {
    fuelRows.length = 0;
    renderPage();
    expect(await screen.findByText(/Pick a fuel to compare/)).toBeInTheDocument();
  });
});
