'use client';

import { useEffect, useState } from 'react';
import { PERMISSIONS, updateNotificationSettingsSchema, type NotificationSettingsDto } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { useNotificationSettings, useUpdateNotificationSettings } from '../hooks';

const ALERTS: { key: 'dispatchSent' | 'paymentReceived' | 'advanceAlert'; title: string; who: string }[] = [
  {
    key: 'dispatchSent',
    title: 'Load dispatched',
    who: 'To the customer, when a challan leaves the gate — challan number, quantity and date.',
  },
  {
    key: 'paymentReceived',
    title: 'Payment received',
    who: 'To the customer, when a receipt is recorded — amount, date and receipt number.',
  },
  {
    key: 'advanceAlert',
    title: 'Advance over the limit',
    who: 'To you, when an advance leaves a Sardar owing more than his gang has earned (LEK-03).',
  },
];

const GATEWAY: Record<NotificationSettingsDto['provider'], string> = {
  log: 'No gateway is connected yet — alerts are written to the log below but not sent.',
  msg91: 'Sending through MSG91.',
  twilio: 'Sending through Twilio.',
};

/**
 * NTF-01 — which alerts go out, and the owner's number for owner alerts.
 * Customers are texted on the phone number in their party record.
 */
export function AlertSettings() {
  const { can } = useSession();
  const canManage = can(PERMISSIONS.COMPANY_MANAGE);
  const { data, isLoading, isError, error } = useNotificationSettings();
  const update = useUpdateNotificationSettings();
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setPhone(data.ownerPhone ?? '');
  }, [data]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !data) return <Alert variant="error">{messageOf(error, 'Could not load the alert settings')}</Alert>;

  const savePhone = () => {
    const parsed = updateNotificationSettingsSchema.safeParse({ ownerPhone: phone });
    if (!parsed.success) {
      setPhoneError(parsed.error.issues[0]?.message ?? 'Enter a 10-digit mobile number');
      return;
    }
    setPhoneError(null);
    update.mutate({ ownerPhone: phone });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS alerts</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert variant={data.provider === 'log' ? 'warning' : 'info'}>
          {GATEWAY[data.provider]} Channel: {data.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}.
        </Alert>

        {update.isError && <Alert variant="error">{messageOf(update.error, 'Could not save')}</Alert>}

        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {ALERTS.map((alert) => (
            <li key={alert.key} className="flex items-start justify-between gap-4 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{alert.title}</p>
                <p className="text-xs text-muted-foreground">{alert.who}</p>
              </div>
              <label className="flex min-h-[2.25rem] shrink-0 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  role="switch"
                  aria-label={alert.title}
                  className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
                  checked={data[alert.key]}
                  disabled={!canManage || update.isPending}
                  onChange={(e) => update.mutate({ [alert.key]: e.target.checked })}
                />
                <span className="w-7 text-muted-foreground">{data[alert.key] ? 'On' : 'Off'}</span>
              </label>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Your mobile, for owner alerts"
              placeholder="98765 43210"
              inputMode="tel"
              value={phone}
              disabled={!canManage}
              error={phoneError ?? undefined}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {canManage && (
            <Button
              variant="outline"
              onClick={savePhone}
              disabled={update.isPending || phone === (data.ownerPhone ?? '')}
            >
              {update.isPending ? <Spinner /> : 'Save number'}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Customers are texted on the phone number in their party record (Masters → Parties). A party without a mobile
          number gets no message.
        </p>
      </CardContent>
    </Card>
  );
}
