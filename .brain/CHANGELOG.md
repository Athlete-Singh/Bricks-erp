# CHANGELOG — newest first

- 2026-10-08 — [ci] — P0.5: GitHub Actions CI workflow (postgres 16 service, node 24, pnpm 12.4.2, build→migrate→lint→typecheck→unit+e2e→build); Husky pre-commit (lint-staged prettier) + commit-msg (commitlint conventional); .prettierignore excludes .brain/ (sync-status regex protection) — P0.5
- 2026-10-08 — [web] — P0.3 complete: web re-enabled in workspace; app router shell (RootLayout, Providers, dashboard route, login stub); components/ui (Button, Card, Badge, Input, Skeleton, EmptyState); components/layout (Sidebar, Topbar with DB health dot, PageHeader, KilnSwitcher stub); lib (api-client fetch wrapper, query-client, cn); stores (ui-store Zustand); features/system health API + useHealth hook; 1 Vitest test; tsconfig fix (exclude vitest.config); gate ✓ lint typecheck test build — P0.3
- 2026-10-07 — [mobile] — P0.4 structure only: Flutter folders per master prompt §6, placeholder app + widget test, env example, mobile/README with setup steps; work split device A (backend+web) / device B (Flutter) — P0.4
- 2026-10-07 — [brain] — Wiring tracker: API_INDEX is now a per-endpoint BE/Web/Mob table; new 🧩 "built but not connected" status; `pnpm status` generates wiring gaps + per-app progress — tracking
- 2026-10-07 — [web] — P0.3 started then paused: configs, Tailwind tokens (light/dark), env example; no pages yet; web excluded from workspace until resumed — P0.3
- 2026-10-07 — [backend] — P0.2: pnpm/Turbo monorepo, shared package, docker Postgres, NestJS 11 scaffold, /api/v1/health, Swagger, env validation, error/envelope, Money utils, migration CLI, unit + e2e tests; per-app env files — P0.2
- 2026-10-07 — [brain/docs] — P0.1: git, PDFs → docs/client-requirements, brain + FEATURES (89 CP1 + 10 CP2), docs 01–13, 16 module stubs, AI entry files, status script — P0.1
- 2026-10-07 — [prompts] — Rewrote BRICS_MASTER_PROMPT.md + BRICS_PHASE_PROMPT.md with CP1/CP2 model, session safety rules, feature register
