# SaaS platform — the S track

Turning BRICS from one kiln's system into something sold to many. New scope,
outside CP1: CP1 is what a kiln uses, this is what the vendor uses to run the
business of selling it.

Decided with the owner on 2026-10-13:

- **One instance, many tenants.** One deployment, one database, companies kept
  apart by `company_id` as they already are.
- **The platform admin creates a company and its owner.** Everything after
  that — accountants, managers, store keepers — the owner creates. The admin
  can do it too, but only through a support session.
- **Support access is announced afterwards, not approved beforehand,** and it
  expires. A kiln owner is not reliably reachable by phone, and support that
  waits for approval is support that does not happen.
- **No billing yet.** The tenant carries a plan name and a status; invoicing
  happens outside the system until there are enough clients to justify it.

## The problem this fixes

Today `super_admin` is an owner with longer arms: the role holds every business
permission, and `RolesGuard` waves it past every check. That makes the platform
operator and the kiln owner the same kind of user, which is wrong in two ways.

It is wrong for the operator, who does not need `sales.manage` to run a SaaS
business and has no screen for the things they do need. And it is wrong for the
client, whose books are readable by the vendor at any moment with no record
that it happened. The day two competing kilns are both on this system, that
stops being a theoretical problem.

## Two kinds of permission

Business permissions (`sales.manage`, `accounts.view`, …) belong to people
inside a kiln. Platform permissions belong to whoever runs the service:

| Permission | What it allows |
| --- | --- |
| `platform.tenants.view` | See the tenant list and each tenant's **metadata** |
| `platform.tenants.manage` | Create a tenant, suspend it, reactivate it |
| `platform.support.request` | Open a support session against one tenant |

A platform admin holds these and **no business permissions at all**. They get
business permissions for exactly one company, for a limited time, only inside a
support session — and the audit log says so.

That means `RolesGuard`'s blanket `if (user.isSuperAdmin) return true` has to
go. It is the single line that makes the whole separation meaningless.

## Metadata, and where the line is

The tenant list is always visible to a platform admin. What it may show is
drawn tightly: **counts and dates, never money and never the client's own
customers.**

Allowed: company name, GST state, status, when it was created, how many users,
how many kilns, when someone last signed in, how many invoices or vouchers
exist.

Not allowed without a support session: any amount, any party name, any
document, any report.

The test for a new field is simple — would the kiln mind a competitor seeing
it? A count of invoices, no. The value of them, yes.

## Support sessions (break-glass)

A platform admin opens a session against one tenant, with a reason typed in.
For the next two hours they hold that tenant's business permissions. Then it
closes by itself, or they close it early.

While it is open:

- Every audit row written carries `actor_kind = 'platform_support'` and the
  session id, so the owner's audit log shows support's work as support's work
  rather than as somebody's ordinary entry.
- The owner sees that the session happened, with the reason and the window.

The reason is mandatory and stored. "Because I could" is not a reason, and
making somebody type one is most of what stops casual looking.

**What this does not pretend to be:** a platform admin with database access can
read anything regardless. This is a control on the product, not on the laptop.
It is worth having anyway — it makes the normal path the private one, and it
leaves a record when the normal path is left.

## The steps

### S1 — tenants and the admin panel

#### S1.1 (backend) — shipped 2026-10-14

- Migration `1794000000000-SaasPlatformTenantFields` adds `companies.status`
  (`trial` | `active` | `suspended`), `plan_name`, `trial_ends_at`,
  `last_active_at`. Existing rows backfilled to `active`.
- Permissions `platform.tenants.view`, `platform.tenants.manage`,
  `platform.support.request`. A tenth role `platform_admin` holds those three
  and no business permissions at all.
- `RolesGuard`'s `if (user.isSuperAdmin) return true` is **gone**. Every
  request is decided by permissions, so a platform operator cannot read a
  kiln's books by accident.
- Platform module (`backend/src/modules/platform/`):
  - `POST /platform/tenants` — one transaction: company → chart of accounts →
    first financial year → owner user → membership. Both the company and the
    owner-user creation audit rows are written in the same transaction, so a
    half-created tenant can never appear in the list.
  - `POST /platform/tenants/:id/suspend` and `.../reactivate` — status flip
    with an audit row (idempotent: a no-op writes nothing).
  - `GET /platform/tenants` and `.../:id` — metadata only.
- `AuthService.buildSession` refuses a suspended tenant's sign-in with the
  `SUSPENDED_TENANT_SIGN_IN_MESSAGE` constant from `@brics/shared`; web and
  mobile both show the same words.

#### S1.2 (web) — shipped 2026-10-14

- `/admin` route group with its own shell — `AdminShell` renders a thin sidebar
  (`Tenants`, with `Support sessions` greyed as *S2*), no company switcher,
  no business menu. The AuthGuard inside the shell refuses a signed-in user
  who does not hold `platform.tenants.view` and routes them to `/dashboard`.
- `/admin` → `/admin/tenants` (server-side `redirect`).
- `/admin/tenants` — searchable list, metadata only (name, state, status,
  plan, created). Row actions: `Suspend` on active/trial, `Reactivate` on
  suspended; both hidden without `platform.tenants.manage`.
- `/admin/tenants/[id]` — a thin detail page with the same metadata and the
  status buttons. Full detail (users, counts, support history) lives at
  PLT-09/S3.1.
- `OnboardTenantDialog` wraps `POST /platform/tenants` — company name, GST
  state, plan name, owner name/mobile/email/password; the FY is left to the
  server. Field errors from the backend's Zod pipe are mapped onto their
  inputs; a 409 on the owner's mobile surfaces on the Alert.
- `SuspendTenantDialog` carries an optional reason that goes on the audit
  trail — a line of text is most of what stops a casual suspension.
- `homeRouteFor(permissions)` is the login-time decision: a user with
  `platform.tenants.view` lands on `/admin`, everyone else on `/dashboard`.
  `PlatformAdminBounce` wraps the kiln dashboard layout and sends a platform
  admin to `/admin` even if they reload a kiln route they had bookmarked.
- `useRoles` filters `platform_admin` out of the picker so an owner never
  sees a role they cannot usefully assign — the guard would refuse the write
  anyway, but a role that nobody can usefully assign is clutter.

#### Still ahead

- **Mobile sign-in refusal (M1):** MOB-01 picks up the suspended-tenant
  message so the kiln sees the same words on every surface.
- **S2 — support sessions:** the platform admin acquires one tenant's
  business permissions, two hours, auto-closed, every audit row marked
  `platform_support`.

### S2 — support sessions

#### S2.1 (backend) — shipped 2026-10-14

- Migration `1795000000000-SupportSessions` adds the table (CHECKs on reason
  length and the `closed_at ⇔ closed_by` pair; partial unique on the open
  session per `(platform_user, company)`) and widens `audit_logs` with
  `actor_kind` + `support_session_id`, paired by a CHECK so the trail cannot
  carry one without the other.
- `POST /platform/support-sessions` opens a session (`platform.support.request`
  required, two hours by default) and hands the client back both the session
  DTO and a switched auth bundle: a JWT with `companyId=tenantId`,
  `roleCode='platform_support'`, the owner's `permissions`, and a new
  `supportSessionId` claim. Its access TTL is the shorter of the configured
  one and the session's remaining window.
- `POST /platform/support-sessions/:id/close` closes early (opener only,
  idempotent). `GET /platform/support-sessions` lists the admin's own
  history; `GET /platform/support-sessions/for-tenant/:id` lists all admins'
  work on one tenant (`platform.tenants.view`).
- `SupportSessionInterceptor` (not a guard — guards cannot read `req.user`;
  JwtAuthGuard populates it) runs globally after authentication, closes an
  expired session on the spot (writes `closed_by='expiry'` + a `system`
  audit row), and refuses with 401 for closed / expired / drifted sessions
  so an abandoned tab cannot keep acting on a tenant.
- `common/audit/audit-context.ts` wraps every request in an
  `AsyncLocalStorage<AuditContext>` set by `AuditContextInterceptor` from
  `req.user.supportSessionId`. `AuditService.record` reads the store and
  stamps the row — so every existing audit call site under a support
  session is tagged `platform_support` without a code change. An explicit
  field on the event still wins (used by `support-session.service.ts` when
  it writes its own CREATE row before the context takes effect, and by the
  interceptor's expiry close for the `system` kind).

#### S2.2 (web) — shipped 2026-10-14

- `OpenSupportSessionDialog` (PLT-07) on the tenant list (`/admin/tenants`) and detail page (`/admin/tenants/[id]`), gated on `platform.support.request`. Mandates a reason (min 3, max 500 chars).
- `support-token-store.ts` backs up the operator's platform tokens (`access` and `refresh`) into `sessionStorage` (`backupPlatformTokens`), and adopts the scoped support JWT (`roleCode='platform_support'`, `companyId=tenantId`). `restorePlatformSession` decodes the token claims and updates `useAuthStore`'s user state synchronously so the user is not bounced by `AdminShell`.
- `SupportSessionBanner` mounted globally in `DashboardLayout`: renders only when `roleCode === 'platform_support'`. Shows tenant name, truncated reason, and a live 1-second countdown to `session.expiresAt` (clamped at `00:00:00` / Expired). Provides "Close session" (calls `closeSupportSession`, restores tokens, pushes `/admin/tenants`) and "Return to admin" (restores platform tokens without closing, pushes `/admin/tenants`).
- `TenantSupportHistory` (PLT-07) embedded on `/admin/tenants/[id]`, displaying opened time, closed time (with green "Active" badge for unclosed sessions), platform opener name, reason (with hover tooltip for full text), and closed-by. Gated on `platform.tenants.view`.
- Owner's audit log (`/audit-logs`, PLT-08): `AuditEntry` widened with `actorKind` and `supportSessionId`. Displays a yellow `Support` badge on rows written by support, with a tooltip showing the session ID and stated reason. Added client-side filter checkbox: "Show only support entries".
- 32 new web unit/component tests across banner, token store, dialog, history, and audit log (web tests 171 → 203).

### S3 — tenant detail and history

#### S3.1 (tenant detail & privacy boundary) — shipped 2026-10-14

- Shared DTOs (`TenantUserSummaryDto`, `TenantSiteSummaryDto`, `TenantCountsDto`, `TenantDetailDto`) in `@brics/shared/schemas/platform`.
- Backend `GET /platform/tenants/:id` aggregates:
  - Document counts: `vouchers` count and `sales_invoices` count.
  - User roster: joining `user_companies` + `users` + `roles` (name, mobile, email, role code/name, user status, joined date). Note: `User` has `is_active: boolean` and does not extend `TenantBaseEntity`, so soft deletion is on `user_companies.deleted_at`.
  - Registered production sites / kilns: `sites` (name, code, type, is_active, created_at).
  - Activity timestamps: `company.last_active_at` stamped by `AuthService.buildSession` on login and company switch, falling back to recent audit log entries.
- Metadata privacy boundary strictly maintained: counts and timestamps only; never financial amounts, invoice lines, party ledgers, or customer details.
- Read-only on platform surface: adding/editing users or kilns is a business action performed inside a support session.
- Web `/admin/tenants/[id]` (PLT-09):
  - 4 high-level KPI cards: Registered users, Kilns (active / total), Documents (vouchers & invoices), and Last active timestamp.
  - Metadata definition list including company legal name, code, GSTIN, status, plan, trial expiry, and created date.
  - Tabbed interface with accessible counts in headers: "Users & roles" (`TenantUsersList`), "Kilns & sites" (`TenantKilnsList`), and "Support history" (`TenantSupportHistory`).
- 8 new web component/page tests (web tests 203 → 211). Backend platform unit and e2e suites updated and passing.

#### S3.2 (per-tenant approval setting) — pending

- Optional per-tenant setting: *require my approval before support access*, for a client who asks for it.

### S4 — billing (deferred)

Plans, trial expiry, payment status, automatic suspension. Only worth building
when there are enough tenants that invoicing by hand hurts.

## What this does not change

CP1 is untouched. A kiln's own experience — its dashboard, its books, its
roles — is the same before and after. The S track adds a surface above it and
takes away a bypass that should not have been there.
