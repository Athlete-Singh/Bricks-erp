# NTF-01 SMS / WhatsApp alerts

**Status (2026-10-22):** built, off by default; sends nothing until a gateway is configured (OQ #14). Human doc: docs/modules/notifications.md.

- **Tables:** `notification_settings` (one per company: `owner_phone`, `dispatch_sent`, `payment_received`, `advance_alert`) ·
  `notifications` outbox (`event`, `channel`, `to_phone` `91XXXXXXXXXX`, `body`, `variables` jsonb, `source_type/id`, `status`
  queued|sent|logged|failed, `provider`, `provider_message_id`, `error`, `attempts`, `next_attempt_at`, `sent_at`).
  `uq_notifications_source (company_id, event, source_id)` — one alert per event per source.
- **Hooks (in the event's transaction):** `DispatchService.confirmDispatch` → dispatch_sent to customer; `SalesService.createCustomerReceipt`
  → payment_received to customer; `LabourService.createAdvance` → advance_alert to owner when LEK-03 `warning` is set. Each calls
  `notifications.kick(companyId)` after commit.
- **Sending:** `NotificationsService.sendPending` claims due rows `FOR UPDATE SKIP LOCKED`; retry 1/5/30/120 min on `ProviderError.retryable`,
  else `failed`. No scheduler: next event, "Send waiting now", or a cron on `POST /notifications/send-pending`.
- **Providers:** `providers/` log (default, dry run) · msg91 (Flow API, DLT template per event) · twilio (Messages API, SMS/WhatsApp).
  `providerFromEnv` falls back to log if credentials are missing. Env: `NOTIFY_*`, `MSG91_*`, `TWILIO_*` (backend/.env.example).
- **Text:** ASCII only (`Rs.`), templates in `notification-templates.ts` — the same sentences must be DLT-registered.
- **Web:** Settings → Alerts (`features/notifications`).
