import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AuthResponseDto } from '@brics/shared';
import { useAuthStore } from '@/stores/auth-store';
import { KilnSwitcher } from './kiln-switcher';

const session: AuthResponseDto = {
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
  company: { id: 'c1', name: 'Shri Ram Bricks', gstin: null, stateCode: '09' },
  sites: [
    { id: 's1', name: 'Kiln One', code: 'K1', type: 'kiln' },
    { id: 's2', name: 'Kiln Two', code: 'K2', type: 'kiln' },
  ],
};

describe('KilnSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().reset();
  });

  it('renders nothing when the user has no kilns', () => {
    const { container } = render(<KilnSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('starts on "All kilns" so an owner sees the whole company', () => {
    useAuthStore.getState().setSession(session);
    render(<KilnSwitcher />);

    expect(screen.getByRole('button', { name: /select kiln/i })).toHaveTextContent('All kilns');
  });

  it('selects a kiln and records it for the rest of the app to filter by', async () => {
    useAuthStore.getState().setSession(session);
    render(<KilnSwitcher />);

    await userEvent.click(screen.getByRole('button', { name: /select kiln/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /kiln two/i }));

    expect(useAuthStore.getState().activeSiteId).toBe('s2');
    expect(screen.getByRole('button', { name: /select kiln/i })).toHaveTextContent('Kiln Two');
  });

  it('goes back to all kilns', async () => {
    useAuthStore.getState().setSession(session);
    useAuthStore.getState().setActiveSite('s1');
    render(<KilnSwitcher />);

    await userEvent.click(screen.getByRole('button', { name: /select kiln/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /all kilns/i }));

    expect(useAuthStore.getState().activeSiteId).toBeNull();
  });

  it('only offers kilns the API returned, which are already tenant-scoped', async () => {
    useAuthStore.getState().setSession(session);
    render(<KilnSwitcher />);

    await userEvent.click(screen.getByRole('button', { name: /select kiln/i }));
    const items = screen.getAllByRole('menuitem').map((el) => el.textContent);

    expect(items).toHaveLength(3); // All kilns + two kilns
    expect(items.join(' ')).toContain('Kiln One');
    expect(items.join(' ')).toContain('Kiln Two');
  });

  it('closes on Escape', async () => {
    useAuthStore.getState().setSession(session);
    render(<KilnSwitcher />);

    await userEvent.click(screen.getByRole('button', { name: /select kiln/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
