import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StockRegisterPage from '@/app/(dashboard)/stock/register/page';
import type { StockRegisterParams, StockRegisterRow } from '../api';

const WAREHOUSE_ID = '11111111-1111-4111-8111-111111111111';
const ITEM_ID = '22222222-2222-4222-8222-222222222222';
const GRADE_ID = '33333333-3333-4333-8333-333333333333';

const TOTAL = 60;
const LIMIT = 25;

function row(overrides: Partial<StockRegisterRow> = {}): StockRegisterRow {
  return {
    id: 'm1',
    movementDate: '2026-10-09',
    movementType: 'purchase',
    warehouseId: WAREHOUSE_ID,
    warehouseName: 'Yard A',
    subjectType: 'item',
    subjectId: ITEM_ID,
    subjectName: 'Coal',
    quantityIn: '100',
    quantityOut: '0',
    runningBalance: '100',
    sourceType: null,
    sourceId: null,
    notes: null,
    ...overrides,
  };
}

const fetchStockRegister = vi.fn((params: StockRegisterParams) =>
  Promise.resolve({
    items: [row()],
    meta: { page: params.page ?? 1, limit: LIMIT, total: TOTAL },
  }),
);

vi.mock('../api', () => ({
  fetchCurrentStock: vi.fn(),
  fetchStockRegister: (params: StockRegisterParams) => fetchStockRegister(params),
  recordOpeningStock: vi.fn(),
  recordAdjustment: vi.fn(),
}));

vi.mock('@/features/masters/api', () => ({
  fetchWarehouses: () =>
    Promise.resolve({ items: [{ id: WAREHOUSE_ID, name: 'Yard A' }], meta: { page: 1, limit: 100, total: 1 } }),
  fetchItems: () =>
    Promise.resolve({ items: [{ id: ITEM_ID, name: 'Coal' }], meta: { page: 1, limit: 100, total: 1 } }),
  fetchBrickTypes: () =>
    Promise.resolve({ items: [{ id: GRADE_ID, grade: 'First Class' }], meta: { page: 1, limit: 100, total: 1 } }),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <StockRegisterPage />
    </QueryClientProvider>,
  );
}

/** Filter options arrive through react-query; nothing can be chosen before. */
async function optionsLoaded() {
  await screen.findByRole('option', { name: 'Yard A' });
  await screen.findByRole('option', { name: 'Coal' });
  await screen.findByRole('option', { name: 'First Class' });
}

const NOTE = /Pick a warehouse and one item or grade/;
const lastParams = () => fetchStockRegister.mock.calls.at(-1)?.[0];

beforeEach(() => {
  fetchStockRegister.mockClear();
});

/**
 * The backend only computes a running balance when the filters narrow to one
 * subject in one warehouse. Across different items in different yards the
 * column would be a sum of unrelated things, which is worse than no column at
 * all — so the page mirrors that rule and explains the absence instead.
 */
describe('Stock register — the running-balance column', () => {
  it('hides the balance column and says why when the filters are still wide', async () => {
    renderPage();

    expect(await screen.findByText(NOTE)).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Balance' })).not.toBeInTheDocument();
  });

  it('still hides it for a warehouse alone — one yard holds many different things', async () => {
    const user = userEvent.setup();
    renderPage();
    await optionsLoaded();

    await user.selectOptions(screen.getByLabelText('Warehouse'), WAREHOUSE_ID);

    expect(await screen.findByText(NOTE)).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Balance' })).not.toBeInTheDocument();
  });

  it('still hides it for an item alone — one item sits in several yards', async () => {
    const user = userEvent.setup();
    renderPage();
    await optionsLoaded();

    await user.selectOptions(screen.getByLabelText('Item'), ITEM_ID);

    expect(await screen.findByText(NOTE)).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Balance' })).not.toBeInTheDocument();
  });

  it('shows the balance column once a warehouse and one item are both chosen', async () => {
    const user = userEvent.setup();
    renderPage();
    await optionsLoaded();

    await user.selectOptions(screen.getByLabelText('Warehouse'), WAREHOUSE_ID);
    await user.selectOptions(screen.getByLabelText('Item'), ITEM_ID);

    expect(await screen.findByRole('columnheader', { name: 'Balance' })).toBeInTheDocument();
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  it('accepts a brick grade in place of an item — a grade narrows just as well', async () => {
    const user = userEvent.setup();
    renderPage();
    await optionsLoaded();

    await user.selectOptions(screen.getByLabelText('Warehouse'), WAREHOUSE_ID);
    await user.selectOptions(screen.getByLabelText('Brick grade'), GRADE_ID);

    expect(await screen.findByRole('columnheader', { name: 'Balance' })).toBeInTheDocument();
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });
});

/**
 * Page 4 of the previous filter is a different set of rows; keeping the page
 * number across a filter change shows the user an arbitrary slice, or an empty
 * page, of results they never asked for.
 */
describe('Stock register — paging across filter changes', () => {
  it('returns to page 1 when a filter changes after paging forward', async () => {
    const user = userEvent.setup();
    renderPage();
    await optionsLoaded();

    await user.click(await screen.findByRole('button', { name: /Next/ }));
    await waitFor(() => expect(lastParams()?.page).toBe(2));

    await user.selectOptions(screen.getByLabelText('Movement'), 'wastage');

    await waitFor(() => expect(lastParams()?.movementType).toBe('wastage'));
    expect(lastParams()?.page).toBe(1);
  });

  it('resets the page for a date filter too, not only the dropdowns', async () => {
    const user = userEvent.setup();
    renderPage();
    await optionsLoaded();

    await user.click(await screen.findByRole('button', { name: /Next/ }));
    await waitFor(() => expect(lastParams()?.page).toBe(2));

    await user.type(screen.getByLabelText('From'), '2026-10-01');

    await waitFor(() => expect(lastParams()?.from).toBe('2026-10-01'));
    expect(lastParams()?.page).toBe(1);
  });
});
