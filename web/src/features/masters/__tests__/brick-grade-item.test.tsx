import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import InventoryMastersPage from '@/app/(dashboard)/masters/inventory/page';

const createBrickType = vi.fn<(dto: Record<string, unknown>) => Promise<{ id: string }>>(() =>
  Promise.resolve({ id: 'bt-new' }),
);

vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return { ...actual, useSession: () => ({ can: () => true, sites: [{ id: 's1', name: 'Kiln One' }] }) };
});

vi.mock('../api', () => ({
  fetchUnits: () => Promise.resolve({ items: [{ id: 'u1', name: 'Thousand', abbreviation: 'K' }], meta: page(1) }),
  createUnit: vi.fn(),
  updateUnit: vi.fn(),
  fetchBrickTypes: () =>
    Promise.resolve({
      items: [{ id: 'bt1', grade: 'Class 1', itemId: 'i-class-1', description: null, isActive: true }],
      meta: page(1),
    }),
  createBrickType: (dto: Record<string, unknown>) => createBrickType(dto),
  updateBrickType: vi.fn(),
  fetchWarehouses: () => Promise.resolve({ items: [], meta: page(0) }),
  createWarehouse: vi.fn(),
  updateWarehouse: vi.fn(),
  fetchItems: () =>
    Promise.resolve({
      items: [
        { id: 'i-class-1', name: 'Class 1 Brick', category: 'other', unitId: 'u1', hsnId: null, isActive: true },
        { id: 'i-jhama', name: 'Jhama Brick', category: 'other', unitId: 'u1', hsnId: null, isActive: true },
      ],
      meta: page(2),
    }),
  createItem: vi.fn(),
  updateItem: vi.fn(),
}));

function page(total: number) {
  return { page: 1, limit: 25, total };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <InventoryMastersPage />
    </QueryClientProvider>,
  );
}

describe('Brick grade ↔ item (ADR-051)', () => {
  it('makes the item part of creating a grade, and sends it', async () => {
    // A grade with no item is a pile nobody can invoice, which is the bug the
    // link exists to prevent — so the form cannot be completed without one.
    const user = userEvent.setup();
    renderPage();

    // One "Add" button serves every tab, so the tab is chosen first.
    await user.click(await screen.findByRole('button', { name: 'Brick Types' }));
    await user.click(screen.getByRole('button', { name: /add/i }));
    await user.type(screen.getByLabelText(/grade \*/i), 'Jhama');
    await user.selectOptions(screen.getByLabelText(/sold as \*/i), 'i-jhama');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(createBrickType).toHaveBeenCalledWith(expect.objectContaining({ grade: 'Jhama', itemId: 'i-jhama' }));
  });

  it('does not offer an item another grade already stands for', async () => {
    // Two grades on one item would put two names on one pile, and the register
    // could not say which was sold.
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Brick Types' }));
    await user.click(screen.getByRole('button', { name: /add/i }));
    const options = Array.from(screen.getByLabelText(/sold as \*/i).querySelectorAll('option')).map((o) => o.value);

    expect(options).toContain('i-jhama');
    expect(options).not.toContain('i-class-1');
  });
});
