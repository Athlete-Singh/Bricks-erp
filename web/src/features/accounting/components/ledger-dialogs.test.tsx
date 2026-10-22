import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Ledger, LedgerGroup } from '../api';
import { CreateLedgerDialog, EditLedgerDialog, groupOptions } from './ledger-dialogs';

const createLedgerMock = vi.fn();
const updateLedgerMock = vi.fn();

vi.mock('../api', () => ({
  createLedger: (dto: unknown) => createLedgerMock(dto),
  updateLedger: (id: string, dto: unknown) => updateLedgerMock(id, dto),
}));

const CURRENT = '10000000-0000-4000-8000-000000000001';
const BANK = '10000000-0000-4000-8000-000000000002';
const CASH = '10000000-0000-4000-8000-000000000003';
const EXPENSES = '10000000-0000-4000-8000-000000000004';

const group = (id: string, name: string, code: string, parentId: string | null = null): LedgerGroup => ({
  id,
  name,
  code,
  parentId,
  nature: 'asset',
  isDirect: false,
  isSystem: true,
});

const groups: LedgerGroup[] = [
  group(CURRENT, 'Current Assets', 'CURRENT_ASSETS'),
  group(CASH, 'Cash-in-hand', 'CASH_IN_HAND', CURRENT),
  group(BANK, 'Bank Accounts', 'BANK_ACCOUNTS', CURRENT),
  group(EXPENSES, 'Indirect Expenses', 'INDIRECT_EXPENSES'),
];

const ledger = (over: Partial<Ledger>): Ledger => ({
  id: '20000000-0000-4000-8000-000000000001',
  groupId: CASH,
  name: 'Cash',
  code: 'CASH',
  openingDebit: '0.00',
  openingCredit: '0.00',
  isSystem: false,
  isActive: true,
  ...over,
});

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  createLedgerMock.mockReset().mockResolvedValue({ id: 'new' });
  updateLedgerMock.mockReset().mockResolvedValue({ id: 'x' });
});

describe('groupOptions', () => {
  it('lists each top-level group with its children under it', () => {
    expect(groupOptions(groups).map((o) => o.label)).toEqual([
      'Current Assets',
      '— Bank Accounts',
      '— Cash-in-hand',
      'Indirect Expenses',
    ]);
  });
});

describe('CreateLedgerDialog', () => {
  it('adds a bank account under Bank Accounts without asking for a group (ADM-08)', async () => {
    const onClose = vi.fn();
    wrap(<CreateLedgerDialog open bank groups={groups} onClose={onClose} />);

    expect(screen.queryByLabelText('Group')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Bank and account'), 'HDFC Bank — Current A/c 1234');
    await userEvent.click(screen.getByRole('button', { name: 'Add bank account' }));

    await waitFor(() =>
      expect(createLedgerMock).toHaveBeenCalledWith({
        name: 'HDFC Bank — Current A/c 1234',
        groupId: BANK,
        code: null,
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('asks for a group for any other ledger', async () => {
    wrap(<CreateLedgerDialog open groups={groups} onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Ledger name'), 'Generator diesel');
    await userEvent.click(screen.getByRole('button', { name: 'Add ledger' }));
    expect(await screen.findByText('Pick a group')).toBeInTheDocument();
    expect(createLedgerMock).not.toHaveBeenCalled();

    await userEvent.selectOptions(screen.getByLabelText('Group'), EXPENSES);
    await userEvent.click(screen.getByRole('button', { name: 'Add ledger' }));
    await waitFor(() =>
      expect(createLedgerMock).toHaveBeenCalledWith({ name: 'Generator diesel', groupId: EXPENSES, code: null }),
    );
  });
});

describe('EditLedgerDialog', () => {
  it('lets a built-in ledger be renamed but not moved or retired', async () => {
    const builtIn = ledger({ isSystem: true });
    wrap(<EditLedgerDialog ledger={builtIn} groups={groups} onClose={vi.fn()} />);

    expect(screen.getByLabelText('Group')).toBeDisabled();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    const name = screen.getByLabelText('Ledger name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Cash at kiln');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateLedgerMock).toHaveBeenCalledWith(builtIn.id, { name: 'Cash at kiln' }));
  });

  it('retires a ledger the owner made, sending only what changed', async () => {
    const own = ledger({ name: 'Old bank', groupId: BANK });
    wrap(<EditLedgerDialog ledger={own} groups={groups} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateLedgerMock).toHaveBeenCalledWith(own.id, { isActive: false }));
  });
});
