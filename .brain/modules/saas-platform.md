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

#### S1.2 (web) — pending

- `/admin` — its own surface, its own navigation, no business menu. The
  language is tenants and plans, not sales and stock, because the fastest way
  to make an admin behave like an owner is to show them an owner's screen.
- Tenant list: metadata only, searchable, newest first.
- **Onboarding wizard:** company name, GST state, owner's name, mobile, email,
  password → calls `POST /platform/tenants`.
- Suspend and reactivate buttons on the tenant detail page.
- The owner's user-admin screen must filter `platform_admin` out of the role
  picker; `/users/roles` returns it now that the role exists.

### S2 — support sessions

- `support_sessions` table: tenant, platform user, reason, opened, expires,
  closed.
- Business permissions resolved from the active session rather than from a
  role.
- `actor_kind` and `support_session_id` on audit rows.
- The owner's audit screen marks support's entries, and lists the sessions
  themselves.

### S3 — tenant detail and history

- One tenant's page: users and their roles, counts, last activity, session
  history.
- The admin can create a user for a tenant — inside a session, like any other
  business action.
- Optional per-tenant setting: *require my approval before support access*, for
  a client who asks for it.

### S4 — billing (deferred)

Plans, trial expiry, payment status, automatic suspension. Only worth building
when there are enough tenants that invoicing by hand hurts.

## What this does not change

CP1 is untouched. A kiln's own experience — its dashboard, its books, its
roles — is the same before and after. The S track adds a surface above it and
takes away a bypass that should not have been there.
