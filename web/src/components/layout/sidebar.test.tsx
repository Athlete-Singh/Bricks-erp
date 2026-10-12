import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthResponseDto } from '@brics/shared';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { Sidebar } from './sidebar';

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));

const preventNavigation = (event: Event) => {
  if ((event.target as HTMLElement)?.closest('a')) event.preventDefault();
};

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
  company: { id: 'c1', name: 'Kiln Co', gstin: null, stateCode: '09', gstScheme: 'regular_12_itc' as const },
  sites: [],
});

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().reset();
    useUiStore.setState({ sidebarOpen: true, mobileNavOpen: false });
    // jsdom cannot navigate; without this it logs "Not implemented" and the
    // suite intermittently failed.
    document.addEventListener('click', preventNavigation);
  });

  afterEach(() => document.removeEventListener('click', preventNavigation));

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

    // Dispatch has no route yet; linking to it would 404. Production and then
    // Purchases each held this slot and each shipped, so this names the
    // furthest-out module rather than whichever is next.
    expect(screen.queryByRole('link', { name: /dispatch/i })).not.toBeInTheDocument();
    expect(screen.getByTitle('Available in P11')).toHaveAttribute('aria-disabled');
  });

  it('hides a built module from someone without its permission', () => {
    // Production now has a route, so the question is no longer "does it exist"
    // but "may this user see it" — a different guard, worth its own case.
    useAuthStore.getState().setSession(sessionWith(['company.view']));
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: /production/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /purchases/i })).not.toBeInTheDocument();
  });

  it('shows Purchases to someone who may view it', () => {
    useAuthStore.getState().setSession(sessionWith(['company.view', 'purchases.view']));
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /purchases/i })).toHaveAttribute('href', '/purchases');
  });

  it('shows Production to someone who may view it', () => {
    useAuthStore.getState().setSession(sessionWith(['company.view', 'production.view']));
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /production/i })).toHaveAttribute('href', '/production');
  });

  it('shows Labour to someone who may view it', () => {
    useAuthStore.getState().setSession(sessionWith(['company.view', 'labour.view']));
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /labour/i })).toHaveAttribute('href', '/labour');
  });

  it('closes the mobile drawer when a link is followed', () => {
    useAuthStore.getState().setSession(sessionWith(['company.view']));
    useUiStore.setState({ mobileNavOpen: true });
    render(<Sidebar />);

    // `preventDefault` keeps jsdom from attempting a real navigation, which it
    // cannot do and which made this test flaky.
    act(() => {
      screen
        .getByRole('link', { name: /settings/i })
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(useUiStore.getState().mobileNavOpen).toBe(false);
  });
});
