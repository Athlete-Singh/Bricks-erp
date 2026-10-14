import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformAdminBounce } from '@/features/auth/components/platform-admin-bounce';
import { homeRouteFor } from '@/features/auth/use-auth';

const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));

const sessionMock = vi.fn();
vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return { ...actual, useSession: () => sessionMock() };
});

function renderWith(permissions: string[]) {
  sessionMock.mockReturnValue({
    status: 'authenticated',
    user: { permissions },
    can: (...needed: string[]) => needed.every((c) => permissions.includes(c)),
  });
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <PlatformAdminBounce>
        <div data-testid="kiln-content">kiln surface</div>
      </PlatformAdminBounce>
    </QueryClientProvider>,
  );
}

describe('PlatformAdminBounce + homeRouteFor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bounces a platform admin to /admin and withholds the kiln content', async () => {
    renderWith(['platform.tenants.view']);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/admin'));
    expect(screen.queryByTestId('kiln-content')).toBeNull();
  });

  it('lets a kiln user through — the business surface is their job', () => {
    renderWith(['company.view', 'accounts.view']);
    expect(screen.getByTestId('kiln-content')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('homeRouteFor sends a platform admin to /admin and a kiln user to /dashboard', () => {
    expect(homeRouteFor(['platform.tenants.view'])).toBe('/admin');
    expect(homeRouteFor(['company.view'])).toBe('/dashboard');
    expect(homeRouteFor(undefined)).toBe('/dashboard');
  });
});
