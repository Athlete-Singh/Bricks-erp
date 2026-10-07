# PHASE PROMPT: use this for every session after Phase 0

> **How to use:** fill in the step ID (e.g. `P1.1`, `P5.3`, `A1`) and paste the block under the line into Claude Code / Cursor / Codex / Antigravity, opened in the repo root.
> Use **one step per session**. The step list lives in `.brain/PROGRESS.md` (copied from §12 of `BRICS_MASTER_PROMPT.md`).
> Special cases: **§B** if the last session left something broken or half-done, **§C** to start Client Phase 2.

---

## A. Normal step

You are continuing the BRICS ERP project. **Step for this session: `P_._`**

**1. Load context (read the brain, not the codebase)**
Read `AGENTS.md` → `.brain/00_INDEX.md` → `.brain/PROGRESS.md` (especially "Resume here") → the `.brain/FEATURES.md` rows for this step's feature IDs → only the relevant `.brain/modules/*.md`. Open source files only when the step needs them.

**2. Preflight: start from green**
- Check `git status` is clean and you are on the last green commit from "Resume here".
- Run the green gate for the apps this step touches (install, lint, typecheck, test, build; `flutter analyze` + `flutter test` for mobile).
- If anything is red **before** you start, fix that first, commit it as `fix: …`, and tell me. Do not build new features on a red base.
- If a required tool is missing on this machine, tell me how to install it before you continue.

**3. Scope check: Client Phase and depth**
- State which Client Phase this step belongs to (**CP1 MVP** or **CP2 Advanced**) and list the feature IDs it covers.
- **CP1 rule:** build exactly the depth written in FEATURES.md. Anything more advanced goes in FEATURES.md → "CP2 candidates", not into code. Correctness (balanced journals, stock formula, GST split, tenancy, audit) is never cut.
- If the step looks too big for one session, propose a split (e.g. `P5.1a` / `P5.1b`) now.

**4. Plan, then wait for my OK**
Give a short plan:
- **Backend:** entities, migration(s), endpoints, posting rules (Dr/Cr), stock effects.
- **Web:** pages, components (reuse existing ones first; create shared components, never duplicate).
- **Mobile:** screens, Drift tables, sync behaviour (only if the step includes mobile).
- **Tests:** what is covered (mandatory for accounting, stock and GST logic).
- **Questions:** anything ambiguous. Add them to `.brain/OPEN_QUESTIONS.md` too.

Wait for my OK. (If I wrote "go" with the step ID, go straight ahead after showing the plan.)

**5. Build in small, green, committed slices**
- Follow `.brain/CONVENTIONS.md`. Parallel sub-agents per app are allowed; you own consistency.
- After each slice (e.g. entity + migration, then service + tests, then controller, then UI), run the gate and **commit** (Conventional Commits).
- Migrations are append-only. No `synchronize: true`. Dev servers run in the background only, and you stop them when done.

**6. Final green gate**
Everything this step touched must pass: lint, typecheck, tests, build, `flutter analyze`/`flutter test`. Start the backend once and check `/api/v1/health`. If something cannot be made green, revert or disable the unfinished part, keep the last green state, and record it as ⚠️ with the reason.

**7. Update tracking (never skip; this is how we know what's done and what's left)**
- `.brain/FEATURES.md`: set each feature ID's status (⬜ 🟨 ✅ ⚠️ ⏭️). ✅ only if built + tested + documented.
- `.brain/PROGRESS.md`: mark the step, update % of CP1 done, and fill **"Resume here"** (last green commit hash, done, half-done, exact next step, blockers).
- `.brain/CHANGELOG.md`: a dated entry with feature IDs.
- `.brain/modules/*.md`, `API_INDEX.md`, `DB_SCHEMA.md`, `ACCOUNTING_RULES.md`, `DECISIONS.md` (if a choice was made).
- `docs/13-roadmap-and-status.md` (status table, "Implemented so far", "Remaining for CP1", % done) and the touched `docs/modules/*.md`.
- Commit: `docs(brain): update tracking after P_._`.

**8. Report**
What's done (feature IDs), how to test it (commands + clicks), what's remaining in this phase, what's next, blockers, open questions. **Do not start the next step.**

---

## B. Recovery: last session broke something or stopped midway

You are continuing the BRICS ERP project. **The last session did not finish cleanly.**

1. Read `AGENTS.md` → `.brain/PROGRESS.md` "Resume here" → `.brain/CHANGELOG.md` (latest entry).
2. Run `git status` and `git log --oneline -10`, then run the full green gate for all apps. Report exactly what is red or uncommitted.
3. Propose one option: **finish** the half-done work, or **revert** to the last green commit. Wait for my OK.
4. Make everything green, commit, and fix the brain so it matches the code (the code is truth): FEATURES statuses, PROGRESS "Resume here", CHANGELOG, `docs/13-roadmap-and-status.md`.
5. Report the current state and the next step. Do not start new features.

---

## C. Starting Client Phase 2 (only after CP1 is signed off)

You are continuing the BRICS ERP project. **CP1 MVP is released. We are starting Client Phase 2, step `A_`.**

1. Load context as in §A.1. Confirm in `.brain/PROGRESS.md` that P13 is ✅ and CP1 is signed off. If not, stop and tell me.
2. Read FEATURES.md §CP2 and the "CP2 candidates" list. Ask me which approved items are in scope for this step. Do not build candidates that I have not approved.
3. Then follow §A steps 2–8. CP2 features must not break CP1 flows: run the full CP1 e2e suite as part of the gate.
