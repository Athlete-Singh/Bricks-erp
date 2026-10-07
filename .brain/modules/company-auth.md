# M01 Company, Auth & RBAC

**Purpose:** Company profile, multi-company, kilns/sites, financial years, users, roles & permissions, audit log, backups.
**Phase:** P1 (ADM-08 in P2, ADM-09 in P13) · **Status:** ⬜ not started

## Features
| ID | Feature | Phase | Status |
|---|---|---|---|
| ADM-01 | Company profile: name, address, state (for place of supply), GSTIN, PAN, logo | P1 | ⬜ |
| ADM-02 | Multiple companies under one login + company switcher | P1 | ⬜ |
| ADM-03 | Multiple kilns/chimneys/sites per company (site type: kiln / branch / depot) + kiln switcher | P1 | ⬜ |
| ADM-04 | Financial years (April–March default): create, set active | P1 | ⬜ |
| ADM-05 | Users: login (email or mobile + password), JWT access/refresh, logout, change password | P1 | ⬜ |
| ADM-06 | 9 seeded roles with default permission sets; Owner assigns role + kiln access per user | P1 | ⬜ |
| ADM-07 | Audit log (who / what / when / before-after) on financial + stock data; simple viewer for Owner | P1 | ⬜ |
| ADM-08 | Company bank accounts (as Bank ledgers) | P2 | ⬜ |
| ADM-09 | Backups via managed DB (Supabase daily backups) + documented restore procedure | P13 | ⬜ |

## Tables (planned)
companies, sites, financial_years, users, user_companies, user_sites, roles, permissions, role_permissions, refresh_tokens, audit_logs

## Endpoints
_(none yet — add one line each, mirror in API_INDEX.md)_

## Screens (planned)
Web: login, company/kiln switcher, company settings, kilns, FYs, users & roles, audit log. Mobile: login, kiln select.

## Postings
None (no vouchers). Bank accounts (ADM-08) create Bank ledgers.

## Known gaps / notes
-
