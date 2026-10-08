# M01 Company, Auth & RBAC

**Purpose:** Company profile, multi-company, kilns/sites, financial years, users, roles & permissions, audit log, backups.
**Phase:** P1 (ADM-08 in P2, ADM-09 in P13) · **Status:** 🧩 backend complete (P1.1 + P1.1b), web pending P1.2

## Features
| ID | Feature | Phase | Status |
|---|---|---|---|
| ADM-01 | Company profile: name, address, state (for place of supply), GSTIN, PAN, logo | P1 |🧩 |
| ADM-02 | Multiple companies under one login + company switcher | P1 |🧩 |
| ADM-03 | Multiple kilns/chimneys/sites per company (site type: kiln / branch / depot) + kiln switcher | P1 |🧩 |
| ADM-04 | Financial years (April–March default): create, set active | P1 |🧩 |
| ADM-05 | Users: login (email or mobile + password), JWT access/refresh, logout, change password | P1 |🧩 |
| ADM-06 | 9 seeded roles with default permission sets; Owner assigns role + kiln access per user | P1 |🧩 |
| ADM-07 | Audit log (who / what / when / before-after) on financial + stock data; simple viewer for Owner | P1 |🧩 |
| ADM-08 | Company bank accounts (as Bank ledgers) | P2 | ⬜ |
| ADM-09 | Backups via managed DB (Supabase daily backups) + documented restore procedure | P13 | ⬜ |

## Tables (migrated)
`companies` · `sites` · `financial_years` · `users` · `user_companies` · `user_sites` · `roles` · `permissions` · `role_permissions` · `refresh_tokens` · `audit_logs`
Migrations: `1700000000000-AuthAndCompanyTables` (tables), `1700000100000-AuthHardening` (indexes, unique keys, `created_at` on the access tables, one-active-FY index).

## Endpoints
See `API_INDEX.md` for the full table. 21 endpoints, all BE 🧩 (built, no consumer yet):
`/auth` login · refresh · logout · switch-company · change-password · me
`/companies` list(own) · current · :id · create · update
`/sites` list(accessible) · create · `/financial-years` list · create · :id/activate
`/users` list · create · :id · roles · `/audit-logs` list

## Services
- `AuthService` — login, rotating refresh (row id in `jti`, O(1) lookup), logout, change-password.
- `MembershipService` — **the single place** that answers "may this user touch this company?". Other modules use it instead of reading `user_companies`.
- `RolesService` — roles and their permission codes.
- `CompanyService` — companies (membership-scoped), kilns and FYs (JWT-scoped).
- `UserService` — users as `UserSummary`; never returns `password_hash`.
- `AuditService` — append-only trail; writes never throw.

## Seed
`pnpm seed` → 9 roles + permission catalogue + grants, idempotent.
Definitions live in `packages/shared/src/constants/permissions.ts`.

## Screens (planned)
Web: login, company/kiln switcher, company settings, kilns, FYs, users & roles, audit log. Mobile: login, kiln select.

## Postings
None (no vouchers). Bank accounts (ADM-08) create Bank ledgers.

## Known gaps / notes
- **Tenancy rule:** no endpoint accepts a `company_id` from the client. Below-company resources read it from the JWT; `/companies/:id` asserts membership; super admins bypass by design. Proved in `backend/test/tenancy.e2e-spec.ts`.
- Custom per-company roles are **CP2**. `roles.company_id` exists and the unique key is `(code, company_id)` so they can be added without a rewrite.
- List endpoints other than `/audit-logs` do not paginate yet.
- Company/Site/FinancialYear responses are still raw entities (no response DTO); users go through `UserSummary`.
- Default permission sets per role were chosen in P1.1b — OPEN_QUESTIONS #13.
