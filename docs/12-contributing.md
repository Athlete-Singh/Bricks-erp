# 12 — Contributing

## Branching
`main` is always green and deployable. Work on `feat/<step>-<short>` (e.g. `feat/p5.1-production-backend`) or `fix/<short>`.

## Commits: Conventional Commits
`feat(sales): add GST invoice posting` · `fix(stock): prevent negative balance` · `docs(brain): update tracking after P5.1` · `test(accounting): …` · `chore`, `ci`, `refactor`. Enforced by commitlint + Husky.

## PR checklist (definition of done)
- [ ] Code follows `.brain/CONVENTIONS.md`; reuses components
- [ ] Tests added (mandatory for posting / stock / GST)
- [ ] `pnpm lint typecheck test build` green; `flutter analyze` + `flutter test` green
- [ ] Migration generated and reviewed (if schema changed)
- [ ] The app's `.env.example` updated (if new env): `backend/`, `web/` or `mobile/env/`
- [ ] `.brain/FEATURES.md` statuses + `PROGRESS.md` Resume here + `CHANGELOG.md` updated
- [ ] `.brain/modules`, `API_INDEX`, `DB_SCHEMA` updated
- [ ] `docs/13-roadmap-and-status.md` + `docs/modules/*` updated
- [ ] CP1 work stays at FEATURES.md depth (extras logged as CP2 candidates)

## AI-assisted work
AI agents start from `AGENTS.md` and use `BRICS_PHASE_PROMPT.md` (one step per session).
