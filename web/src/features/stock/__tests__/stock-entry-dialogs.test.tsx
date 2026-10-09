import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StockAdjustmentDialog } from '../components/stock-entry-dialogs';

// Real UUIDs: the shared schema validates these ids, so a placeholder would be
// rejected the moment the dialog is wired to a non-mocked API.
const WAREHOUSE_ID = '11111111-1111-4111-8111-111111111111';
const ITEM_ID = '22222222-2222-4222-8222-222222222222';
const GRADE_ID = '33333333-3333-4333-8333-333333333333';

const recordAdjustment = vi.fn<(dto: Record<string, unknown>) => Promise<unknown>>(() => Promise.resolve({}));

vi.mock('../api', () => ({
  fetchCurrentStock: vi.fn(),
  fetchStockRegister: vi.fn(),
  recordOpeningStock: vi.fn(),
  recordAdjustment: (dto: Record<string, unknown>) => recordAdjustment(dto),
}));

vi.mock('@/features/masters/api', () => ({
  fetchWarehouses: () =>
    Promise.resolve({ items: [{ id: WAREHOUSE_ID, name: 'Yard A' }], meta: { page: 1, limit: 100, total: 1 } }),
  fetchItems: () =>
    Promise.resolve({ items: [{ id: ITEM_ID, name: 'Coal' }], meta: { page: 1, limit: 100, total: 1 } }),
  fetchBrickTypes: () =>
    Promise.resolve({ items: [{ id: GRADE_ID, grade: 'First Class' }], meta: { page: 1, limit: 100, total: 1 } }),
}));

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <StockAdjustmentDialog open onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

const submitButton = () => screen.getByRole('button', { name: 'Record adjustment' });

/** The master lists arrive through react-query; nothing can be chosen before. */
async function optionsLoaded() {
  await screen.findByRole('option', { name: 'Coal' });
  await screen.findByRole('option', { name: 'First Class' });
}

beforeEach(() => {
  recordAdjustment.mockClear();
});

/**
 * The submit gate mirrors the server's own schema. It exists so the user is
 * told what is missing while they can still fix it, rather than filling the
 * whole form and being refused — and so an adjustment, the one entry allowed
 * to take a balance below zero, never reaches the audit log with a reason
 * nobody can act on.
 */
describe('Stock adjustment — the submit gate', () => {
  it('stays disabled with no subject chosen, even once the reason is long enough', async () => {
    const user = userEvent.setup();
    renderDialog();
    await optionsLoaded();

    await user.type(screen.getByLabelText('Reason *'), 'Physical count found fifty fewer');

    expect(submitButton()).toBeDisabled();
  });

  it('stays disabled with a subject but a reason under ten characters', async () => {
    const user = userEvent.setup();
    renderDialog();
    await optionsLoaded();

    await user.selectOptions(screen.getByLabelText('Item'), ITEM_ID);
    await user.type(screen.getByLabelText('Reason *'), 'breakage');

    expect(submitButton()).toBeDisabled();
  });

  it('does not count surrounding whitespace toward the ten-character floor', async () => {
    const user = userEvent.setup();
    renderDialog();
    await optionsLoaded();

    await user.selectOptions(screen.getByLabelText('Item'), ITEM_ID);
    await user.type(screen.getByLabelText('Reason *'), '  broken  ');

    expect(submitButton()).toBeDisabled();
  });

  it('enables submit once a subject is chosen and the reason reaches ten characters', async () => {
    const user = userEvent.setup();
    renderDialog();
    await optionsLoaded();

    await user.selectOptions(screen.getByLabelText('Item'), ITEM_ID);
    await user.type(screen.getByLabelText('Reason *'), 'Broken in');
    expect(submitButton()).toBeDisabled();

    // The tenth character is the schema's floor, so it is the one that matters.
    await user.type(screen.getByLabelText('Reason *'), ' transit');
    expect(submitButton()).toBeEnabled();
  });
});

/**
 * The API refuses an entry carrying both an item and a brick grade (ADR-023).
 * The picker therefore clears the other side rather than letting the form hold
 * a combination the backend is certain to reject.
 */
describe('Subject picker — item and grade are exclusive', () => {
  it('clears a chosen item when a brick grade is picked', async () => {
    const user = userEvent.setup();
    renderDialog();
    await optionsLoaded();

    await user.selectOptions(screen.getByLabelText('Item'), ITEM_ID);
    await user.selectOptions(screen.getByLabelText('Brick grade'), GRADE_ID);

    expect(screen.getByLabelText('Item')).toHaveValue('');
    expect(screen.getByLabelText('Brick grade')).toHaveValue(GRADE_ID);
  });

  it('clears a chosen brick grade when an item is picked', async () => {
    const user = userEvent.setup();
    renderDialog();
    await optionsLoaded();

    await user.selectOptions(screen.getByLabelText('Brick grade'), GRADE_ID);
    await user.selectOptions(screen.getByLabelText('Item'), ITEM_ID);

    expect(screen.getByLabelText('Brick grade')).toHaveValue('');
    expect(screen.getByLabelText('Item')).toHaveValue(ITEM_ID);
  });

  it('sends exactly one subject — the cleared side goes as null, not as a stale id', async () => {
    const user = userEvent.setup();
    renderDialog();
    await optionsLoaded();

    await user.selectOptions(screen.getByLabelText('Warehouse *'), WAREHOUSE_ID);
    await user.selectOptions(screen.getByLabelText('Item'), ITEM_ID);
    await user.selectOptions(screen.getByLabelText('Brick grade'), GRADE_ID);
    await user.type(screen.getByLabelText('Quantity *'), '50');
    await user.type(screen.getByLabelText('Reason *'), 'Physical count on 9 Oct found 50 fewer');
    await user.click(submitButton());

    await waitFor(() => expect(recordAdjustment).toHaveBeenCalled());
    expect(recordAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        warehouseId: WAREHOUSE_ID,
        itemId: null,
        brickTypeId: GRADE_ID,
        direction: 'out',
        quantity: '50',
      }),
    );
  });
});
