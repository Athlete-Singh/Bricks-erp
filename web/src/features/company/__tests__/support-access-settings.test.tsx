import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Company } from '../api';
import { SupportAccessSettings } from '../components/support-access-settings';

const updateCompanyMock = vi.fn();
const grantSupportAccessMock = vi.fn();
const revokeSupportAccessMock = vi.fn();

vi.mock('../api', () => ({
  updateCompany: (id: string, dto: unknown) => updateCompanyMock(id, dto),
  grantSupportAccess: (dto: unknown) => grantSupportAccessMock(dto),
  revokeSupportAccess: () => revokeSupportAccessMock(),
}));

const COMPANY: Company = {
  id: 'c1',
  name: 'Ganga Bricks',
  gstin: '09AAACG1234F1Z5',
  pan: 'AAACG1234F',
  stateCode: '09',
  address: 'Varanasi',
  logoUrl: null,
  gstScheme: 'regular_12_itc',
  isActive: true,
  requireSupportApproval: false,
  supportAccessGrantedUntil: null,
};

function renderSettings(company = COMPANY, canEdit = true) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SupportAccessSettings company={company} canEdit={canEdit} />
    </QueryClientProvider>,
  );
}

describe('SupportAccessSettings (PLT-10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default announce-afterwards policy and allows toggling approval requirement', async () => {
    const user = userEvent.setup();
    renderSettings();

    expect(screen.getByText('Platform Support Access & Privacy')).toBeInTheDocument();
    expect(screen.getByText('Standard Policy')).toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox', { name: /require explicit approval/i });
    expect(checkbox).not.toBeChecked();

    updateCompanyMock.mockResolvedValue({ ...COMPANY, requireSupportApproval: true });
    await user.click(checkbox);

    expect(updateCompanyMock).toHaveBeenCalledWith('c1', {
      requireSupportApproval: true,
    });
  });

  it('allows owner to grant temporary support access and displays the generated code', async () => {
    const user = userEvent.setup();
    grantSupportAccessMock.mockResolvedValue({
      grantedUntil: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      code: '849201',
    });

    renderSettings();

    const grantBtn = screen.getByRole('button', { name: /grant temporary access/i });
    await user.click(grantBtn);

    await waitFor(() => {
      expect(grantSupportAccessMock).toHaveBeenCalledWith({ durationHours: 4 });
      expect(screen.getByText('849201')).toBeInTheDocument();
      expect(screen.getByText(/temporary approval code generated/i)).toBeInTheDocument();
    });
  });

  it('renders active window status and allows owner to revoke access immediately', async () => {
    const user = userEvent.setup();
    const futureDate = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    const grantedCompany: Company = {
      ...COMPANY,
      requireSupportApproval: true,
      supportAccessGrantedUntil: futureDate,
    };

    revokeSupportAccessMock.mockResolvedValue({ revoked: true });

    renderSettings(grantedCompany);

    expect(screen.getByText(/support access active until/i)).toBeInTheDocument();
    const revokeBtn = screen.getByRole('button', { name: /revoke access/i });
    await user.click(revokeBtn);

    await waitFor(() => {
      expect(revokeSupportAccessMock).toHaveBeenCalled();
    });
  });

  it('disables mutation controls when canEdit is false', () => {
    renderSettings(COMPANY, false);

    const checkbox = screen.getByRole('checkbox', { name: /require explicit approval/i });
    expect(checkbox).toBeDisabled();

    expect(screen.queryByRole('button', { name: /grant temporary access/i })).toBeNull();
  });
});
