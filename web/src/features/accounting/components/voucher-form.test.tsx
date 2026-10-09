import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { VoucherForm } from './voucher-form';

const createVoucherMock = vi.fn();
const pushMock = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock, back: vi.fn() }) }));
// Real UUIDs: the shared schema validates `ledgerId` as one, so a placeholder
// id would fail validation and the form would never submit.
const CASH_ID = '11111111-1111-4111-8111-111111111111';
const SALES_ID = '22222222-2222-4222-8222-222222222222';
const CLOSED_ID = '33333333-3333-4333-8333-333333333333';

vi.mock('../api', () => ({
  createVoucher: (dto: unknown) => createVoucherMock(dto),
  fetchLedgers: () =>
    Promise.resolve([
      { id: CASH_ID, name: 'Cash', isActive: true, groupId: 'g1', code: 'CASH' },
      { id: SALES_ID, name: 'Sales — Bricks', isActive: true, groupId: 'g2', code: 'SALES_BRICKS' },
      { id: CLOSED_ID, name: 'Closed Account', isActive: false, groupId: 'g2', code: null },
    ]),
}));

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <VoucherForm />
    </QueryClientProvider>,
  );
}

/** The ledger list loads asynchronously; nothing can be selected before it does. */
async function waitForLedgers() {
  await waitFor(() => {
    expect(within(screen.getAllByLabelText('Ledger')[0]!).getByRole('option', { name: 'Cash' })).toBeInTheDocument();
  });
}

const lineAmounts = () => ({
  debits: screen.getAllByLabelText('Debit'),
  credits: screen.getAllByLabelText('Credit'),
  ledgers: screen.getAllByLabelText('Ledger'),
});

async function fillBalancedVoucher(debit: string, credit: string) {
  const { debits, credits, ledgers } = lineAmounts();
  await userEvent.selectOptions(ledgers[0]!, CASH_ID);
  await userEvent.type(debits[0]!, debit);
  await userEvent.selectOptions(ledgers[1]!, SALES_ID);
  await userEvent.type(credits[1]!, credit);
}

describe('VoucherForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('starts with two lines, because a journal needs two sides', async () => {
    renderForm();
    await waitForLedgers();
    expect(screen.getAllByLabelText('Ledger')).toHaveLength(2);
  });

  it('will not let the form drop below two lines', async () => {
    renderForm();
    await waitForLedgers();

    for (const button of screen.getAllByRole('button', { name: /remove line/i })) {
      expect(button).toBeDisabled();
    }
  });

  it('adds and removes lines', async () => {
    renderForm();
    await waitForLedgers();

    await userEvent.click(screen.getByRole('button', { name: /add line/i }));
    expect(screen.getAllByLabelText('Ledger')).toHaveLength(3);

    await userEvent.click(screen.getAllByRole('button', { name: /remove line/i })[0]!);
    expect(screen.getAllByLabelText('Ledger')).toHaveLength(2);
  });

  it('offers only active ledgers — a closed account cannot be posted to', async () => {
    renderForm();
    await waitForLedgers();

    const options = within(screen.getAllByLabelText('Ledger')[0]!).getAllByRole('option');
    const names = options.map((o) => o.textContent);

    expect(names).toContain('Cash');
    expect(names).not.toContain('Closed Account');
  });

  describe('the running balance', () => {
    it('cannot post an empty voucher', async () => {
      renderForm();
      await waitForLedgers();

      expect(screen.getByRole('button', { name: /post voucher/i })).toBeDisabled();
      expect(screen.getByText(/enter an amount to post/i)).toBeInTheDocument();
    });

    it('blocks posting while debits and credits differ, and says by how much', async () => {
      renderForm();
      await waitForLedgers();

      await fillBalancedVoucher('1000', '900');

      expect(await screen.findByText(/out of balance by/i)).toBeInTheDocument();
      expect(screen.getByText('₹100.00')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /post voucher/i })).toBeDisabled();
    });

    it('enables posting once it balances', async () => {
      renderForm();
      await waitForLedgers();

      await fillBalancedVoucher('1000', '1000');

      expect(await screen.findByText(/^Balanced$/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /post voucher/i })).toBeEnabled();
    });

    it('adds paise exactly — three 0.10 debits balance one 0.30 credit', async () => {
      // With float arithmetic 0.1+0.1+0.1 !== 0.3 and this voucher would be
      // stuck as "out of balance by ₹0.00".
      renderForm();
      await waitForLedgers();
      await userEvent.click(screen.getByRole('button', { name: /add line/i }));
      await userEvent.click(screen.getByRole('button', { name: /add line/i }));

      const { debits, credits, ledgers } = lineAmounts();
      for (const index of [0, 1, 2]) {
        await userEvent.selectOptions(ledgers[index]!, CASH_ID);
        await userEvent.type(debits[index]!, '0.10');
      }
      await userEvent.selectOptions(ledgers[3]!, SALES_ID);
      await userEvent.type(credits[3]!, '0.30');

      expect(await screen.findByText(/^Balanced$/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /post voucher/i })).toBeEnabled();
    });
  });

  describe('posting', () => {
    it('sends the voucher and goes to the Day Book with it highlighted', async () => {
      createVoucherMock.mockResolvedValue({ voucher: { id: 'v1', number: 'PMT/2026-27/000001' }, lines: [] });
      renderForm();
      await waitForLedgers();

      await fillBalancedVoucher('1000', '1000');
      await userEvent.click(screen.getByRole('button', { name: /post voucher/i }));

      await waitFor(() => {
        expect(createVoucherMock).toHaveBeenCalledWith(
          expect.objectContaining({
            voucherType: 'payment',
            lines: [
              expect.objectContaining({ ledgerId: CASH_ID, debit: '1000' }),
              expect.objectContaining({ ledgerId: SALES_ID, credit: '1000' }),
            ],
          }),
        );
        expect(pushMock).toHaveBeenCalledWith('/accounts/day-book?highlight=v1');
      });
    });

    it('shows the backend message when posting is refused', async () => {
      createVoucherMock.mockRejectedValue(
        new ApiError(422, 'FY_LOCKED', 'Financial year 2025-26 is locked. Post into an open year.'),
      );
      renderForm();
      await waitForLedgers();

      await fillBalancedVoucher('1000', '1000');
      await userEvent.click(screen.getByRole('button', { name: /post voucher/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent('2025-26 is locked');
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
