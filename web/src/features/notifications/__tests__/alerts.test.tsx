import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationDto, NotificationSettingsDto } from '@brics/shared';
import { AlertLog } from '../components/alert-log';
import { AlertSettings } from '../components/alert-settings';

let granted: string[] = ['company.view', 'company.manage'];
vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return { ...actual, useSession: () => ({ can: (...codes: string[]) => codes.every((c) => granted.includes(c)) }) };
});

const settings: NotificationSettingsDto = {
  ownerPhone: null,
  dispatchSent: false,
  paymentReceived: true,
  advanceAlert: false,
  provider: 'log',
  channel: 'sms',
};
const updateMock = vi.fn();
const sendMock = vi.fn();
const log: NotificationDto[] = [
  {
    id: 'n1',
    event: 'dispatch_sent',
    channel: 'sms',
    toPhone: '919876543210',
    body: 'Shree Bricks: Challan DC-00031 - 5,000 left our kiln on 22 Oct 2026. Thank you.',
    status: 'failed',
    provider: 'twilio',
    error: "Twilio 400: The 'To' number is not valid",
    attempts: 1,
    sentAt: null,
    createdAt: '2026-10-22T09:00:00.000Z',
  },
];

vi.mock('../api', () => ({
  fetchNotificationSettings: () => Promise.resolve(settings),
  updateNotificationSettings: (dto: unknown) => updateMock(dto),
  fetchNotifications: () => Promise.resolve({ items: log, meta: { page: 1, limit: 25, total: 1 } }),
  sendPendingNotifications: () => sendMock(),
}));

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  granted = ['company.view', 'company.manage'];
  updateMock.mockReset().mockImplementation((dto: object) => Promise.resolve({ ...settings, ...dto }));
  sendMock.mockReset().mockResolvedValue({ sent: 0, logged: 1, failed: 0, retrying: 0 });
});

describe('Alert settings (NTF-01)', () => {
  it('says plainly when nothing is actually being sent', async () => {
    wrap(<AlertSettings />);
    expect(await screen.findByText(/No gateway is connected yet/)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Payment received' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Load dispatched' })).not.toBeChecked();
  });

  it('turns an alert on with one tap', async () => {
    wrap(<AlertSettings />);
    await userEvent.click(await screen.findByRole('switch', { name: 'Load dispatched' }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledWith({ dispatchSent: true }));
  });

  it('refuses a number that is not a mobile, then saves one that is', async () => {
    wrap(<AlertSettings />);
    const phone = await screen.findByLabelText('Your mobile, for owner alerts');
    await userEvent.type(phone, '0522 22345');
    await userEvent.click(screen.getByRole('button', { name: 'Save number' }));
    expect(await screen.findByText(/10-digit mobile number/)).toBeInTheDocument();
    expect(updateMock).not.toHaveBeenCalled();

    await userEvent.clear(phone);
    await userEvent.type(phone, '98765 43210');
    await userEvent.click(screen.getByRole('button', { name: 'Save number' }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledWith({ ownerPhone: '98765 43210' }));
  });

  it('is read-only without company.manage', async () => {
    granted = ['company.view'];
    wrap(<AlertSettings />);
    expect(await screen.findByRole('switch', { name: 'Load dispatched' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save number' })).not.toBeInTheDocument();
  });
});

describe('Alert log', () => {
  it('shows each message, who it went to and why it failed', async () => {
    wrap(<AlertLog />);
    expect((await screen.findAllByText('+91 98765 43210')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/not valid/).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: /Send waiting now/ }));
    await waitFor(() => expect(sendMock).toHaveBeenCalled());
  });
});
