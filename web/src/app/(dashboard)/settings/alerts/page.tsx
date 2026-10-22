'use client';

import { AlertLog } from '@/features/notifications/components/alert-log';
import { AlertSettings } from '@/features/notifications/components/alert-settings';

/** NTF-01 — SMS / WhatsApp alerts: which go out, and what went out. */
export default function AlertsSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <AlertSettings />
      <AlertLog />
    </div>
  );
}
