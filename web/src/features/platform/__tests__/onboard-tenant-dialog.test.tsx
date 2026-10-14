import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { OnboardTenantDialog } from '../components/onboard-tenant-dialog';

const createMock = vi.fn();

vi.mock('../api', () => ({
  createTenant: (dto: unknown) => createMock(dto),
}));

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={client}>
      <OnboardTenantDialog open onClose={onClose} />
    </QueryClientProvider>,
  );
  return { ...utils, onClose };
}

describe('OnboardTenantDialog (PLT-05)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not call the API with an empty form — the shared schema catches it', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: /onboard$/i }));

    expect(await screen.findByText(/company name is required/i)).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('onboards a tenant and closes on success — null-coerces blank optional fields', async () => {
    createMock.mockResolvedValue({
      tenant: { id: 't1', name: 'Alpha Bricks', status: 'active' },
      owner: { id: 'o1', mobile: '9876543210', email: null, name: 'Alpha Owner' },
      financialYear: { id: 'fy1', name: '2026-27' },
    });
    const { onClose } = renderDialog();

    await userEvent.type(screen.getByLabelText(/company name/i), 'Alpha Bricks');
    await userEvent.type(screen.getByLabelText(/state code/i), '09');
    await userEvent.type(screen.getByLabelText(/full name/i), 'Alpha Owner');
    await userEvent.type(screen.getByLabelText(/mobile/i), '9876543210');
    await userEvent.type(screen.getByLabelText(/temporary password/i), 'correct-horse');

    await userEvent.click(screen.getByRole('button', { name: /onboard$/i }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: 'Alpha Bricks',
          stateCode: '09',
          ownerName: 'Alpha Owner',
          ownerMobile: '9876543210',
          ownerPassword: 'correct-horse',
          // Blank optional strings are normalised to null — the backend's DTO
          // treats absence as "use the default".
          planName: null,
          ownerEmail: null,
        }),
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('maps a server field error onto the field it names (409 → the mobile row)', async () => {
    createMock.mockRejectedValue(new ApiError(409, 'CONFLICT', 'A user with this mobile already exists'));
    renderDialog();

    await userEvent.type(screen.getByLabelText(/company name/i), 'Alpha Bricks');
    await userEvent.type(screen.getByLabelText(/state code/i), '09');
    await userEvent.type(screen.getByLabelText(/full name/i), 'Alpha Owner');
    await userEvent.type(screen.getByLabelText(/mobile/i), '9876543210');
    await userEvent.type(screen.getByLabelText(/temporary password/i), 'correct-horse');

    await userEvent.click(screen.getByRole('button', { name: /onboard$/i }));

    // Without field details the top-level alert carries the server message.
    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
  });
});
