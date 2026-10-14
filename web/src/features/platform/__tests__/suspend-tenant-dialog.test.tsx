import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TenantSummaryDto } from '@brics/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SuspendTenantDialog } from '../components/suspend-tenant-dialog';

const suspendMock = vi.fn();
vi.mock('../api', () => ({
  suspendTenant: (id: string, dto: unknown) => suspendMock(id, dto),
}));

const TENANT: TenantSummaryDto = {
  id: 't1',
  name: 'Alpha Bricks',
  stateCode: '09',
  status: 'active',
  planName: null,
  trialEndsAt: null,
  lastActiveAt: null,
  createdAt: '2026-10-14T00:00:00.000Z',
};

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={client}>
      <SuspendTenantDialog tenant={TENANT} open onClose={onClose} />
    </QueryClientProvider>,
  );
  return { ...utils, onClose };
}

describe('SuspendTenantDialog (PLT-06)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('names the tenant in the title so a cross-click on the list cannot suspend the wrong one', () => {
    renderDialog();
    expect(screen.getByText(/suspend alpha bricks\?/i)).toBeInTheDocument();
  });

  it('fires suspend without a reason — the field is optional', async () => {
    suspendMock.mockResolvedValue({ ...TENANT, status: 'suspended' });
    const { onClose } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: /^suspend$/i }));

    await waitFor(() => {
      expect(suspendMock).toHaveBeenCalledWith('t1', { reason: undefined });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('attaches a typed reason — it goes on the audit trail', async () => {
    suspendMock.mockResolvedValue({ ...TENANT, status: 'suspended' });
    renderDialog();

    await userEvent.type(screen.getByLabelText(/reason/i), 'non-payment');
    await userEvent.click(screen.getByRole('button', { name: /^suspend$/i }));

    await waitFor(() => {
      expect(suspendMock).toHaveBeenCalledWith('t1', { reason: 'non-payment' });
    });
  });
});
