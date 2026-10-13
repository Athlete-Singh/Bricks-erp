# 14 — Security review (P13.1)

Reviewed 2026-10-13, against `main` at the end of P11. This is the pre-go-live
pass the SOW calls for: what was checked, what was found, what was fixed here,
and what is deliberately left for later with a reason.

It is a review of **this codebase**, not a penetration test. Anything depending
on the hosting platform (TLS, WAF, DDoS, database network rules) is listed at
the end as deployment work, because it cannot be settled in the repository.

## Method

Every item below was checked by reading the code and, where the answer was not
obvious from reading, by running it. Claims that a guard "is there" are worth
nothing without a test that fails when it is removed, so the fixes in this pass
each come with one.

## What was checked

| Area                  | Verdict   | Notes                                                                                                                                                                                                                                                                    |
| --------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SQL injection         | Pass      | Every runtime query is parameterised. Raw SQL interpolates only hard-coded identifiers (table and column names, aliases). Search filters bind `%term%` as a parameter. Migrations interpolate constants from their own arrays.                                           |
| Tenancy               | Pass      | `TenantGuard` on every controller but `health`. `company_id` comes from the signed token, never from the request body or a query string. Cross-tenant refusal is covered by `tenancy.e2e-spec.ts` and by per-module tests.                                               |
| Permissions           | Pass      | Every mutating route carries `@RequirePermissions` (checked mechanically, not by eye). Releasing money needs `accounts.manage` on top of the module's own permission; opening the gate (`dispatch.manage`) is separate from signing for a load (`dispatch.acknowledge`). |
| Ids in request bodies | Pass      | ADR-021 — every id in a body is re-checked against the caller's company before use, so a valid id from another tenant is a 404 and not a silent cross-tenant write.                                                                                                      |
| Password storage      | Pass      | bcrypt, cost 10. No password is ever logged or returned.                                                                                                                                                                                                                 |
| Token custody         | Pass      | Access token in memory only, 15 minutes; refresh token hashed at rest, rotated on every use, revoked on password change (ADR-015/016).                                                                                                                                   |
| Membership revocation | Pass      | `refresh` re-resolves membership and refuses a user removed from the company, so access ends within one access-token lifetime rather than at the refresh token's 30-day expiry.                                                                                          |
| Error responses       | Pass      | No stack traces or driver text reach the client; 500s are logged server-side and answered with "Something went wrong".                                                                                                                                                   |
| Secrets in the repo   | Pass      | No `.env` is tracked — only `.example` files. The only credentials in version control are test passwords in e2e specs.                                                                                                                                                   |
| Audit trail           | Pass      | ADM-07 — financial and stock writes record who, what, when and before/after.                                                                                                                                                                                             |
| Rate limiting         | **Fixed** | There was none. See below.                                                                                                                                                                                                                                               |
| Security headers      | **Fixed** | There were none. See below.                                                                                                                                                                                                                                              |
| API documentation     | **Fixed** | Swagger was served unconditionally, including in production. See below.                                                                                                                                                                                                  |

## Fixed in this pass

### 1. No rate limiting — login could be guessed at

`POST /auth/login` accepted unlimited attempts from one address. An ERP holding
a company's books is worth guessing at, and the kiln's own staff are a handful
of people who know their passwords.

Now: **10 attempts per minute per address** on login, 30 on refresh (it also
takes a secret), and a **300 per minute** default on everything else so a route
written tomorrow is covered the day it is written.

Deliberately **not** a per-account lockout: that hands anyone who knows an
employee's email address the ability to lock a real user out of the system.

Rate limiting is off under `NODE_ENV=test` — the e2e suite fires hundreds of
requests a second from one address on purpose, and a throttled suite would go
red for reasons unrelated to the code under test. The check is on the
environment, not on a setting an operator could switch off in production by
accident. `app-throttler.guard.spec.ts` asserts both the limits and that the
skip is test-only.

### 2. No security headers

The API sent no `X-Content-Type-Options`, no framing policy and a default
referrer policy. `helmet` is now applied, with CSP left off (the API renders no
HTML of its own) and `crossOriginResourcePolicy` relaxed to `same-site` because
the web app fetches invoice and challan PDFs as blobs.

### 3. Swagger was public in production

`/api/docs` described every route and body shape in the system to anyone who
found the URL. It is now served only when `NODE_ENV` is not `production`.

## Accepted, with reasons

- **Constraint names in error details.** A duplicate returns the constraint
  that stopped it. It names a table, which is mild disclosure, and it is what
  lets the web show "a unit with this abbreviation already exists" rather than
  "something went wrong". Kept.
- **Login timing.** A missing user skips the bcrypt compare, so a wrong email
  answers slightly faster than a wrong password. Measuring it across the
  internet is noisy, the message is identical either way, and rate limiting now
  caps how many samples anyone can take. Noted, not changed.
- **A user with no kiln grants sees every kiln in the company.** That is the
  intended default — kiln access is a narrowing, not a requirement (ADM-06).

## Deferred, with reasons

- **Refresh-token reuse detection.** A reused token is refused, but the
  family is not revoked, so a thief and the real user can take turns until the
  30 days run out. Full detection means revoking every descendant of a reused
  token, which needs a token lineage column. CP2 candidate.
- **Two-factor authentication.** Not in CP1's scope; the SOW's access control
  is role-based.
- **Field-level encryption** of GSTIN/PAN. These are printed on every invoice
  the kiln issues; encrypting them in the database protects against a stolen
  dump only, and the managed database's encryption at rest already covers that.

## Deployment work this review cannot do (P13.2)

These are settings on the hosting platforms, and they matter as much as
anything above:

1. **TLS everywhere**, HTTP redirected to HTTPS, HSTS on the web domain.
2. **`CORS_ORIGINS` set to the real web origin.** The default is
   `http://localhost:3000`; leaving it would break the deployment, but setting
   it to `*` to "fix" that would hand every site on the internet the ability to
   call the API with a user's browser.
3. **`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`** generated fresh per
   environment, at least 32 characters, never shared between staging and
   production.
4. **Database reachable only from the API**, not from the public internet.
5. **`NODE_ENV=production`**, which is also what closes the API docs.
6. **Backups verified by restoring one**, not merely by being enabled —
   ADM-09, in P13.2.
7. **`pnpm seed` re-run after deploy** when a release adds permission codes:
   migrations do not reach existing role rows, and a permission nobody holds
   looks exactly like a missing feature.
