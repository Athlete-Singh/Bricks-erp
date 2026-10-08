import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { LoginForm } from './login-form';

const loginMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock('../api', () => ({ login: (dto: unknown) => loginMock(dto) }));

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginForm />
    </QueryClientProvider>,
  );
}

const session = {
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
  company: { id: 'c1', name: 'Kiln Co', gstin: null, stateCode: '09' },
  sites: [],
};

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('does not call the API when the form is empty', async () => {
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/email or mobile is required/i)).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('rejects a password shorter than the shared schema allows', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/email or mobile/i), '9000000000');
    await userEvent.type(screen.getByLabelText(/password/i), 'abc');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/at least 6 characters/i)).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('submits valid credentials and redirects to the dashboard', async () => {
    loginMock.mockResolvedValue(session);
    renderForm();

    await userEvent.type(screen.getByLabelText(/email or mobile/i), 'owner@kiln.test');
    await userEvent.type(screen.getByLabelText(/password/i), 'correct-horse');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        emailOrMobile: 'owner@kiln.test',
        password: 'correct-horse',
      });
      expect(replaceMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows the server message when the credentials are rejected', async () => {
    loginMock.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Invalid email/mobile or password'));
    renderForm();

    await userEvent.type(screen.getByLabelText(/email or mobile/i), 'owner@kiln.test');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email/mobile or password');
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('maps a 400 from the backend onto the field it names', async () => {
    loginMock.mockRejectedValue(
      new ApiError(400, 'VALIDATION_FAILED', 'Validation failed', [
        { field: 'emailOrMobile', message: 'Not a known identifier format' },
      ]),
    );
    renderForm();

    await userEvent.type(screen.getByLabelText(/email or mobile/i), 'nonsense');
    await userEvent.type(screen.getByLabelText(/password/i), 'correct-horse');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/not a known identifier format/i)).toBeInTheDocument();
  });
});
