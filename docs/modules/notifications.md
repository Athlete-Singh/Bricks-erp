# SMS / WhatsApp alerts (NTF-01)

> Status: **Built 2026-10-22, switched off** — every alert is written and shown in Settings → Alerts, and
> nothing is sent until the client's gateway account is connected (OPEN_QUESTIONS #14). Gateway charges are
> the client's (SOW §3).

## The three alerts

| Alert                  | Goes to                                | When                                                                    | Text                                                                                                |
| ---------------------- | -------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Load dispatched        | The customer's phone (party record)    | A challan leaves the gate (DSP-02)                                      | `{company}: Challan {challan} - {quantity} left our kiln on {date}. Thank you.`                     |
| Payment received       | The customer's phone                   | A customer receipt is recorded (SAL-05)                                 | `{company}: Received Rs. {amount} on {date}, receipt {receipt}. Thank you for your payment.`        |
| Advance over the limit | The owner's mobile (Settings → Alerts) | An advance leaves a Sardar owing more than his gang has earned (LEK-03) | `{company}: Advance of Rs. {amount} to {sardar}. Unsecured advance exposure is now Rs. {exposure}.` |

Each is off until the owner turns it on in **Settings → Alerts**. A party without a mobile number simply gets
nothing; an alert never stops a challan, receipt or advance from being saved.

## How it works

- **Outbox.** The alert is written in the same database transaction as the event. If the challan rolls back,
  so does its alert; a phone resending the same entry (same `Idempotency-Key`) never writes a second one
  (`uq_notifications_source`).
- **Sending** happens straight after the event commits. A gateway outage (5xx, 429, unreachable) is retried
  after 1, 5, 30 and 120 minutes; a refusal that will not change (bad number, bad key, unregistered template)
  is marked **Failed** at once with the gateway's reason.
- **Retries need a nudge.** There is no background worker on a serverless host: queued alerts go out on the
  next event, on **Send waiting now** in Settings → Alerts, or from a cron calling
  `POST /api/v1/notifications/send-pending` with an owner token.
- **Log mode.** With no gateway configured (`NOTIFY_PROVIDER=log`, the default), alerts are marked
  **Logged, not sent** — the owner can see exactly what would have gone out before paying for anything.

## Connecting a gateway (server environment)

### MSG91 (SMS, India)

1. MSG91 account + **DLT registration** (TRAI): register the sender ID and the three texts above as
   templates, with the brace words as variables.
2. Create a **Flow** per template in MSG91; note each Flow / template id.
3. Set on the API host:
   ```
   NOTIFY_PROVIDER=msg91
   MSG91_AUTH_KEY=…
   MSG91_TEMPLATE_DISPATCH_SENT=…
   MSG91_TEMPLATE_PAYMENT_RECEIVED=…
   MSG91_TEMPLATE_ADVANCE_ALERT=…
   ```
   MSG91 fills the registered text from the variables `company, challan, quantity, date, amount, receipt,
sardar, exposure` — name the Flow variables exactly so.

### Twilio (SMS or WhatsApp)

```
NOTIFY_PROVIDER=twilio
NOTIFY_CHANNEL=sms            # or whatsapp
TWILIO_ACCOUNT_SID=AC…
TWILIO_AUTH_TOKEN=…
TWILIO_FROM=+1…               # a number, or a Messaging Service SID (MG…); for WhatsApp the WhatsApp sender
```

Indian SMS through Twilio still needs DLT registration of the sender and texts. WhatsApp business messages
need the three texts approved as WhatsApp templates.

Restart the API; **Settings → Alerts** then names the gateway instead of "No gateway is connected yet".
A gateway named without its credentials falls back to log mode rather than failing every alert.

## API

| Method | Path                          | Permission     |
| ------ | ----------------------------- | -------------- |
| GET    | `/notifications/settings`     | company.view   |
| PUT    | `/notifications/settings`     | company.manage |
| GET    | `/notifications`              | company.view   |
| POST   | `/notifications/send-pending` | company.manage |

## How to test

- Backend: `src/modules/notifications/__tests__` (templates, phone numbers, MSG91 / Twilio requests and which
  failures retry) and `test/notifications.e2e-spec.ts` (settings, tenancy, one alert per gate-out even when the
  confirm is retried, the owner's advance alert with an idempotent replay, retry-then-fail).
- Web: `features/notifications/__tests__/alerts.test.tsx`.
- By hand: turn **Load dispatched** on, give a customer a mobile number, confirm a challan — the message
  appears under Messages as _Logged, not sent_ (or _Sent_ once a gateway is connected).
