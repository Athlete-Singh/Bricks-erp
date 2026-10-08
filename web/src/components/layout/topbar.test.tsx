import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { Topbar } from './topbar';

// Topbar now renders UserMenu, which uses the router and the logout mutation.
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

vi.mock('@/features/system/use-health', () => ({
  useHealth: () => ({
    data: { status: 'ok', db: 'up', version: '0.0.0', uptimeSeconds: 1, timestamp: '' },
    isError: false,
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('Topbar', () => {
  it('shows DB connected when health returns db up', () => {
    render(<Topbar />, { wrapper });
    expect(screen.getByText('DB connected')).toBeInTheDocument();
  });
});
