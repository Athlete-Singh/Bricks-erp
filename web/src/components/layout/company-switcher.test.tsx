import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthResponseDto } from '@brics/shared';
import { useAuthStore } from '@/stores/auth-store';
import { CompanySwitcher } from './company-switcher';

const companiesMock = vi.fn();
const switchCompanyMock = vi.fn();

vi.mock('@/features/company/api', () => ({ fetchMyCompanies: () => companiesMock() }));
vi.mock('@/features/auth/api', () => ({ switchCompany: (dto: unknown) => switchCompanyMock(dto) }));

const sessionFor = (id: string, name: string): AuthResponseDto => ({
  accessToken: 'a',
  refreshToken: 'r',
  user: {
    id: 'u1',
    email: null,
    mobile: '9000000000',
    name: 'Owner',
    roleCode: 'owner',
    permissions: [],
    isSuperAdmin: false,
  },
  company: { id, name, gstin: null, stateCode: '09' },
  sites: [],
});

function renderSwitcher() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CompanySwitcher />
    </QueryClientProvider>,
  );
}

describe('CompanySwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.getState().reset();
    companiesMock.mockResolvedValue([
      { id: 'c1', name: 'Shri Ram Bricks' },
      { id: 'c2', name: 'Maa Durga Bricks' },
    ]);
  });

  it('renders nothing when signed out', () => {
    const { container } = renderSwitcher();
    expect(container).toBeEmptyDOMElement();
  });

  it('hides itself when the user belongs to only one company', async () => {
    companiesMock.mockResolvedValue([{ id: 'c1', name: 'Shri Ram Bricks' }]);
    useAuthStore.getState().setSession(sessionFor('c1', 'Shri Ram Bricks'));

    renderSwitcher();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /switch company/i })).not.toBeInTheDocument();
    });
  });

  it('switches to another company and adopts the re-issued session', async () => {
    useAuthStore.getState().setSession(sessionFor('c1', 'Shri Ram Bricks'));
    switchCompanyMock.mockResolvedValue(sessionFor('c2', 'Maa Durga Bricks'));

    renderSwitcher();
    await userEvent.click(await screen.findByRole('button', { name: /switch company/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /maa durga/i }));

    await waitFor(() => {
      expect(switchCompanyMock).toHaveBeenCalledWith({ companyId: 'c2' });
      // The whole session is replaced: the JWT now carries the new company id.
      expect(useAuthStore.getState().company?.id).toBe('c2');
    });
  });

  it('does not call the API when the current company is picked again', async () => {
    useAuthStore.getState().setSession(sessionFor('c1', 'Shri Ram Bricks'));

    renderSwitcher();
    await userEvent.click(await screen.findByRole('button', { name: /switch company/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /shri ram/i }));

    expect(switchCompanyMock).not.toHaveBeenCalled();
  });
});
