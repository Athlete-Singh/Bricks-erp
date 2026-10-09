import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TaxesPage from '@/app/(dashboard)/masters/taxes/page';
import LabourRatesPage from '@/app/(dashboard)/masters/labour/page';

const createHsnRate = vi.fn<(dto: Record<string, unknown>) => Promise<{ id: string }>>(() =>
  Promise.resolve({ id: 'h1' }),
);
const createWageRate = vi.fn<(dto: Record<string, unknown>) => Promise<{ id: string }>>(() =>
  Promise.resolve({ id: 'w1' }),
);

vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return { ...actual, useSession: () => ({ can: () => true }) };
});

vi.mock('../api', () => ({
  fetchHsnRates: () => Promise.resolve({ items: [], meta: { page: 1, limit: 25, total: 0 } }),
  createHsnRate: (dto: Record<string, unknown>) => createHsnRate(dto),
  updateHsnRate: vi.fn(),
  fetchWageRates: () => Promise.resolve({ items: [], meta: { page: 1, limit: 25, total: 0 } }),
  createWageRate: (dto: Record<string, unknown>) => createWageRate(dto),
  updateWageRate: vi.fn(),
}));

function renderPage(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  createHsnRate.mockClear();
  createWageRate.mockClear();
});

describe('Taxes screen', () => {
  /**
   * The CGST/SGST split is mechanical — half the total each — and typing it by
   * hand is where the mistakes happen. If this ever splits wrongly, every
   * invoice raised within the state carries the wrong tax.
   */
  it('splits a total rate into equal CGST and SGST halves, and the whole into IGST', async () => {
    const user = userEvent.setup();
    renderPage(<TaxesPage />);

    await user.click(await screen.findByRole('button', { name: 'Add rate' }));
    await user.click(screen.getByRole('button', { name: '12%' }));

    expect(screen.getByLabelText('CGST %')).toHaveValue('6.00');
    expect(screen.getByLabelText('SGST %')).toHaveValue('6.00');
    expect(screen.getByLabelText('IGST %')).toHaveValue('12');
  });

  it('splits an odd total to the paise rather than rounding it away', async () => {
    const user = userEvent.setup();
    renderPage(<TaxesPage />);

    await user.click(await screen.findByRole('button', { name: 'Add rate' }));
    await user.click(screen.getByRole('button', { name: '5%' }));

    expect(screen.getByLabelText('CGST %')).toHaveValue('2.50');
    expect(screen.getByLabelText('SGST %')).toHaveValue('2.50');
  });

  it('sends the code and the rates the way the API expects them', async () => {
    const user = userEvent.setup();
    renderPage(<TaxesPage />);

    await user.click(await screen.findByRole('button', { name: 'Add rate' }));
    await user.type(screen.getByLabelText('HSN / SAC code *'), '6904');
    await user.click(screen.getByRole('button', { name: '12%' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(createHsnRate).toHaveBeenCalled());
    expect(createHsnRate).toHaveBeenCalledWith(
      expect.objectContaining({ hsnCode: '6904', cgstRate: '6.00', sgstRate: '6.00', igstRate: '12' }),
    );
  });

  it('does not send an empty effectiveFrom — the column defaults to today', async () => {
    const user = userEvent.setup();
    renderPage(<TaxesPage />);

    await user.click(await screen.findByRole('button', { name: 'Add rate' }));
    await user.type(screen.getByLabelText('HSN / SAC code *'), '6905');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(createHsnRate).toHaveBeenCalled());
    expect(createHsnRate.mock.calls[0]?.[0]).not.toHaveProperty('effectiveFrom');
  });
});

describe('Wage rates screen', () => {
  it('fills in the unit each activity is conventionally paid by', async () => {
    const user = userEvent.setup();
    renderPage(<LabourRatesPage />);

    await user.click(await screen.findByRole('button', { name: 'Add rate' }));
    await user.selectOptions(screen.getByLabelText('Activity *'), 'making');

    expect(screen.getByLabelText('Per *')).toHaveValue('1000 bricks');
  });

  it('switches the unit to a day for the daily wage', async () => {
    const user = userEvent.setup();
    renderPage(<LabourRatesPage />);

    await user.click(await screen.findByRole('button', { name: 'Add rate' }));
    await user.selectOptions(screen.getByLabelText('Activity *'), 'daily_wage');

    expect(screen.getByLabelText('Per *')).toHaveValue('day');
  });

  it('sends the rate as a string, never a number', async () => {
    const user = userEvent.setup();
    renderPage(<LabourRatesPage />);

    await user.click(await screen.findByRole('button', { name: 'Add rate' }));
    await user.selectOptions(screen.getByLabelText('Activity *'), 'making');
    await user.type(screen.getByLabelText('Rate (₹) *'), '650');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(createWageRate).toHaveBeenCalled());
    const dto = createWageRate.mock.calls[0]?.[0];
    expect(dto?.rateAmount).toBe('650');
    expect(typeof dto?.rateAmount).toBe('string');
  });
});
