# M01 Company, Auth & RBAC

> Status: **Backend complete, web pending** (P1.1 + P1.1b; web screens land in P1.2) · Build phase: P1 (ADM-08 in P2, ADM-09 in P13)
> Scope source: `docs/client-requirements/` · Tracker: [13-roadmap-and-status.md](../13-roadmap-and-status.md)

## Purpose

Company profile, multi-company, kilns/sites, financial years, users, roles & permissions, audit log, backups.

## Planned scope (MVP depth)

| ID     | Feature                                                                                         | Phase | Status |
| ------ | ----------------------------------------------------------------------------------------------- | ----- | ------ |
| ADM-01 | Company profile: name, address, state (for place of supply), GSTIN, PAN, logo                   | P1    | 🧩     |
| ADM-02 | Multiple companies under one login + company switcher                                           | P1    | 🧩     |
| ADM-03 | Multiple kilns/chimneys/sites per company (site type: kiln / branch / depot) + kiln switcher    | P1    | 🧩     |
| ADM-04 | Financial years (April–March default): create, set active                                       | P1    | 🧩     |
| ADM-05 | Users: login (email or mobile + password), JWT access/refresh, logout, change password          | P1    | 🧩     |
| ADM-06 | 9 seeded roles with default permission sets; Owner assigns role + kiln access per user          | P1    | 🧩     |
| ADM-07 | Audit log (who / what / when / before-after) on financial + stock data; simple viewer for Owner | P1    | 🧩     |
| ADM-08 | Company bank accounts (as Bank ledgers)                                                         | P2    | ⬜     |
| ADM-09 | Backups via managed DB (Supabase daily backups) + documented restore procedure                  | P13   | ⬜     |

## Data

Planned tables: companies, sites, financial_years, users, user_companies, user_sites, roles, permissions, role_permissions, refresh_tokens, audit_logs

## Screens

Web: login, company/kiln switcher, company settings, kilns, FYs, users & roles, audit log. Mobile: login, kiln select.

## Accounting effect

None (no vouchers). Bank accounts (ADM-08) create Bank ledgers.

## How it works

_(Filled in when the module is built: flows, rules, examples.)_

## How to test

_(Filled in when built.)_
