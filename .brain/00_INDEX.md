# BRAIN INDEX — read this first

Compact AI memory for BRICS ERP. Read 2–4 files, not the codebase.

## Reading order (every session)
1. `../AGENTS.md` — rules, commands, definition of done
2. `PROGRESS.md` — current step + **Resume here**
3. `FEATURES.md` — only the rows for this step's feature IDs
4. `modules/<module>.md` — only modules touched by this step

## Files
| File | What | Read when |
|---|---|---|
| PROJECT.md | What BRICS is, roles, lifecycle, CP1/CP2, stack, repo map | First session / need domain context |
| PROGRESS.md | Build tracker, step statuses, Resume here, blockers | Always |
| FEATURES.md | Requirement register (IDs, depth, status) | Always (relevant rows) |
| CONVENTIONS.md | Coding rules for backend / web / mobile | Before writing code |
| DECISIONS.md | ADR log | Before changing architecture |
| ACCOUNTING_RULES.md | Posting matrix Dr/Cr, voucher rules | Any money / voucher work |
| DB_SCHEMA.md | Tables → key columns → relations | Entities / migrations |
| API_INDEX.md | Every endpoint + **wiring** (BE / Web / Mob status, auto gaps list) | Adding / calling endpoints; "what's built but unused?" |
| GLOSSARY.md | Domain terms (Sardar, GRN, chamber…) | Unknown term |
| OPEN_QUESTIONS.md | Decisions pending from owner/client | Planning a step |
| CHANGELOG.md | Dated history | Recovery / "what changed" |
| modules/*.md | Per-module scope, tables, endpoints, screens, postings | Working on that module |
| archive/ | Old changelog entries | Rarely |

## End of session (never skip)
FEATURES statuses (BE/Web/Mob/Tests) → API_INDEX wiring columns → `pnpm status` (regenerates summaries, wiring gaps, `docs/13-roadmap-and-status.md`) → PROGRESS (+Resume here) → CHANGELOG → modules/DB_SCHEMA → commit.
If brain and code disagree, **code is truth** — fix the brain.
