import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthResponseDto } from '@brics/shared';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { Sidebar } from './sidebar';

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));

const sessionWith = (permissions: string[], isSuperAdmin = false): AuthResponseDto => ({
  accessToken: 'a',
  refreshToken: 'r',
  user: {
    id: 'u1',
    email: null,
    mobile: '9000000000',
    name: 'User',
    roleCode: 'supervisor',
    permissions,
    isSuperAdmin,
  },
  company: { id: 'c1', name: 'Kiln Co', gstin: null, stateCode: '09' },
  sites: [],
});

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().reset();
    useUiStore.setState({ sidebarOpen: true, mobileNavOpen: false });
  });

  it('hides Settings from a user without company.view', () => {
    useAuthStore.getState().setSession(sessionWith([]));
    render(<Sidebar />);

    expect(screen.queryByRole('link', { name: /settings/i })).not.toBeInTheDocument();
  });

  it('shows Settings to a user who holds company.view', () => {
    useAuthStore.getState().setSession(sessionWith(['company.view']));
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
  });

  it('shows everything to a super admin regardless of codes', () => {
    useAuthStore.getState().setSession(sessionWith([], true));
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });

  it('renders unbuilt modules as disabled labels, not dead links', () => {
    useAuthStore.getState().setSession(sessionWith(['company.view']));
    render(<Sidebar />);

    // Production has no route yet; linking to it would 404.
    expect(screen.queryByRole('link', { name: /production/i })).not.toBeInTheDocument();
    expect(screen.getByTitle('Available in P5')).toHaveAttribute('aria-disabled');
  });

  it('closes the mobile drawer when a link is followed', () => {
    useAuthStore.getState().setSession(sessionWith(['company.view']));
    useUiStore.setState({ mobileNavOpen: true });
    render(<Sidebar />);

    screen.getByRole('link', { name: /settings/i }).click();

    expect(useUiStore.getState().mobileNavOpen).toBe(false);
  });
});
