import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PartiesPage from '@/app/(dashboard)/masters/parties/page';

const LEDGER_ID = '44444444-4444-4444-8444-444444444444';

const party = {
  id: '55555555-5555-4555-8555-555555555555',
  name: 'Shyam Traders',
  partyTypes: ['customer'],
  gstin: null,
  pan: null,
  stateCode: null,
  address: null,
  phone: null,
  email: null,
  openingDebit: '50000.00',
  openingCredit: '0.00',
  ledgerId: LEDGER_ID,
  isActive: true,
  companyId: 'c1',
};

const closing = { debit: '0.00', credit: '0.00' };

vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return { ...actual, useSession: () => ({ can: () => true }) };
});

vi.mock('../api', () => ({
  fetchParties: () => Promise.resolve({ items: [party], meta: { page: 1, limit: 25, total: 1 } }),
  createParty: vi.fn(),
  updateParty: vi.fn(),
}));

vi.mock('@/features/accounting/api', () => ({
  fetchLedgerStatement: () =>
    Promise.resolve({
      ledger: { id: LEDGER_ID, name: 'Shyam Traders' },
      group: { name: 'Sundry Debtors' },
      opening: { debit: '0.00', credit: '0.00' },
      closing,
      totals: { debit: '0.00', credit: '0.00' },
      rows: [],
    }),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PartiesPage />
    </QueryClientProvider>,
  );
}

async function openStatement() {
  const user = userEvent.setup();
  renderPage();
  // DataTable renders a table and a card list, hiding one by CSS, so the name
  // matches twice. Either opens the same panel.
  //
  // `findAllByRole` rather than a bare `getAllByRole`: the list arrives through
  // react-query, and under a full parallel `pnpm test` the render lands later
  // than a synchronous query allows — which is exactly how this failed once.
  const [button] = await screen.findAllByRole('button', { name: 'Shyam Traders' });
  await user.click(button!);
}

/**
 * PTY-04 leads with the outstanding balance, and the direction is the whole
 * point: a debit balance on a customer is money owed *to* the kiln, a credit
 * balance is money the kiln owes. Printing it the wrong way round on a money
 * screen is worse than printing nothing.
 */
describe('Party statement', () => {
  it('reads a debit balance as money the party owes the kiln', async () => {
    closing.debit = '50000.00';
    closing.credit = '0.00';

    await openStatement();

    expect(await screen.findByText(/They owe you/)).toBeInTheDocument();
    expect(screen.getAllByText('₹50,000.00').length).toBeGreaterThan(0);
  });

  it('reads a credit balance as money the kiln owes the party', async () => {
    closing.debit = '0.00';
    closing.credit = '12500.00';

    await openStatement();

    expect(await screen.findByText(/You owe them/)).toBeInTheDocument();
    expect(screen.getAllByText('₹12,500.00').length).toBeGreaterThan(0);
  });

  it('says settled when nothing is outstanding, rather than showing a bare zero', async () => {
    closing.debit = '0.00';
    closing.credit = '0.00';

    await openStatement();

    expect(await screen.findByText(/Settled/)).toBeInTheDocument();
  });
});
