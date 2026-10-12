# CLAUDE.md

**Read [`AGENTS.md`](AGENTS.md) first.** It is the single source of truth for this repo (rules, read order, commands, definition of done).

Claude-specific notes:

- For each session, the user gives a step via `BRICS_PHASE_PROMPT.md`. Do only that step.
- Use a task list for multi-part steps. Sub-agents (one per app) are fine; they must follow `.brain/CONVENTIONS.md`.
- Run dev servers in the background and stop them before finishing.
- Commits carry no AI attribution: no `Co-Authored-By: Claude …`, no "Generated with Claude Code", no 🤖. See AGENTS.md session safety rule 4.
