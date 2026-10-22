import { z } from 'zod';

/** NTF-01 — the alerts the SOW names. */
export const NOTIFICATION_EVENTS = ['dispatch_sent', 'payment_received', 'advance_alert'] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

/**
 * `queued` waiting to go · `sent` the gateway accepted it · `logged` written
 * only, because no gateway is configured · `failed` the gateway refused it
 * after every retry.
 */
export const NOTIFICATION_STATUSES = ['queued', 'sent', 'logged', 'failed'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

/** An Indian mobile: 10 digits, optionally with +91 / 91 / 0 in front. Blank clears it. */
const indianMobile = z
  .union([
    z.literal(''),
    z
      .string()
      .transform((v) => v.replace(/[\s()-]/g, ''))
      .refine((v) => /^(\+?91|0)?[6-9]\d{9}$/.test(v), 'Enter a 10-digit mobile number, like 98765 43210'),
    z.null(),
  ])
  .transform((v) => (v === '' || v === null ? null : v));

export const updateNotificationSettingsSchema = z.object({
  /** Who gets the owner's alerts (advance over the limit). */
  ownerPhone: indianMobile.optional(),
  dispatchSent: z.boolean().optional(),
  paymentReceived: z.boolean().optional(),
  advanceAlert: z.boolean().optional(),
});
export type UpdateNotificationSettingsDto = z.infer<typeof updateNotificationSettingsSchema>;
export type UpdateNotificationSettingsInput = z.input<typeof updateNotificationSettingsSchema>;

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  status: z.enum(NOTIFICATION_STATUSES).optional(),
  event: z.enum(NOTIFICATION_EVENTS).optional(),
});
export type NotificationQueryDto = z.infer<typeof notificationQuerySchema>;
export type NotificationQueryInput = z.input<typeof notificationQuerySchema>;

export interface NotificationSettingsDto {
  ownerPhone: string | null;
  dispatchSent: boolean;
  paymentReceived: boolean;
  advanceAlert: boolean;
  /** Which gateway the server is set up with — `log` means nothing actually goes out. */
  provider: 'log' | 'msg91' | 'twilio';
  channel: 'sms' | 'whatsapp';
}

export interface NotificationDto {
  id: string;
  event: NotificationEvent;
  channel: 'sms' | 'whatsapp';
  toPhone: string;
  body: string;
  status: NotificationStatus;
  provider: string | null;
  error: string | null;
  attempts: number;
  sentAt: string | null;
  createdAt: string;
}
