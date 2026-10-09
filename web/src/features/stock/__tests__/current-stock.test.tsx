import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '@brics/shared';
import CurrentStockPage from '@/app/(dashboard)/stock/current/page';
import type { CurrentStock, CurrentStockRow } from '../api';

const WAREHOUSE_ID = '11111111-1111-4111-8111-111111111111';

/** Rewritten per test; `can` reads it at render time, not at mock time. */
let granted: string[] = [];

vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return {
    ...actual,
    useSession: () => ({ can: (...codes: string[]) => codes.every((code) => granted.includes(code)) }),
  };
});

function row(overrides: Partial<CurrentStockRow> = {}): CurrentStockRow {
  return {
    siteId: 's1',
    siteName: 'Main Kiln',
    warehouseId: WAREHOUSE_ID,
    warehouseName: 'Yard A',
    subjectType: 'brick',
    subjectId: 'b1',
    subjectName: 'First Class',
    unit: null,
    opening: '0',
    purchased: '0',
    produced: '0',
    adjustedIn: '0',
    transferredIn: '0',
    sold: '0',
    wasted: '0',
    adjustedOut: '0',
    transferredOut: '0',
    closing: '0',
    ...overrides,
  };
}

let currentStock: CurrentStock = { asOf: '2026-10-09', from: null, rows: [], totals: { totalIn: '0', totalOut: '0' } };

vi.mock('../api', () => ({
  fetchCurrentStock: () => Promise.resolve(currentStock),
  fetchStockRegister: vi.fn(),
  recordOpeningStock: vi.fn(),
  recordAdjustment: vi.fn(),
}));

vi.mock('@/features/masters/api', () => ({
  fetchWarehouses: () =>
    Promise.resolve({ items: [{ id: WAREHOUSE_ID, name: 'Yard A' }], meta: { page: 1, limit: 100, total: 1 } }),
  fetchItems: () => Promise.resolve({ items: [], meta: { page: 1, limit: 100, total: 0 } }),
  fetchBrickTypes: () => Promise.resolve({ items: [], meta: { page: 1, limit: 100, total: 0 } }),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CurrentStockPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  granted = [];
  currentStock = { asOf: '2026-10-09', from: null, rows: [], totals: { totalIn: '0', totalOut: '0' } };
});

/**
 * `inventory.manage` and `inventory.adjust` are deliberately separate rights:
 * a store keeper may record what a yard holds, but must not be able to write
 * off the shortfall they are themselves accountable for. Collapsing the two
 * gates onto one permission would silently hand them that power, so these are
 * security assertions, not UI preferences.
 */
describe('Current stock — the two write gates', () => {
  it('offers opening stock but not Adjust to a manage-only user, so a keeper cannot write off a shortfall', async () => {
    granted = [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_MANAGE];

    renderPage();

    expect(await screen.findByRole('button', { name: 'Opening stock' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adjust' })).not.toBeInTheDocument();
  });

  it('offers Adjust but not opening stock to an adjust-only user — the rights do not imply each other', async () => {
    granted = [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_ADJUST];

    renderPage();

    expect(await screen.findByRole('button', { name: 'Adjust' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Opening stock' })).not.toBeInTheDocument();
  });

  it('shows neither entry point to a view-only user', async () => {
    granted = [PERMISSIONS.INVENTORY_VIEW];

    renderPage();

    // The empty state arrives with the query, so the page has finished rendering.
    expect(await screen.findByText('Nothing in stock yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adjust' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Opening stock' })).not.toBeInTheDocument();
  });
});

describe('Current stock — closing balances', () => {
  /**
   * A negative closing balance means the books claim a yard holds less than
   * nothing: either a missed receipt or a theft. It must not read like any
   * other number on the page.
   */
  it('marks a negative closing balance in the error colour', async () => {
    currentStock.rows = [
      row({ subjectId: 'b1', subjectName: 'First Class', closing: '1200' }),
      row({ subjectId: 'b2', subjectName: 'Second Class', sold: '500', closing: '-500' }),
    ];

    renderPage();

    const negative = await screen.findByText('-500');
    expect(negative.className).toContain('text-danger');

    const positive = screen.getByText('1,200');
    expect(positive.className).not.toContain('text-danger');
  });
});
