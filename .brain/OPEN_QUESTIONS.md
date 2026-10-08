# OPEN QUESTIONS — need owner / client decision

Format: `#N — question — default we use until answered — needed by phase — status`

1. Confirm CP1/CP2 split (ADV-01…07 are in the Functional Spec but not the SOW MVP rows) — default: as in FEATURES.md — P1 — open
2. GST for bricks: HSN (usually 6904) and rate (12% with ITC vs 6% special scheme without ITC); rates for coal, sand, spares (diesel is outside GST) — default: seed configurable rows, owner edits — P3 — open
3. Default chart of accounts: Tally-style groups (ACCOUNTING_RULES.md) OK? — default: yes — P2 — open
4. Closing stock valuation for P&L/BS: weighted average cost, or standard rate per 1,000 entered at period end? — default: standard rate per grade entered at period end — P10 — open
5. One business with many companies, or SaaS for many clients? (billing out of CP1 either way) — default: multi-company schema, no billing — P1 — open
6. Supervisor app language: English only in CP1, or Hindi too? — default: English, l10n-ready — P12 — open
7. Brick grades actually used and their names — default: Class 1, Class 2, Class 3, Broken (editable) — P3 — open
8. Piece-rate structure: per activity per 1,000? Who records loading counts (supervisor app?) — default: making/loading/unloading rates per 1,000, supervisor records — P6 — open
9. Inter-kiln stock transfer needed in CP1? — default: no (CP2 candidate) — P4 — open
10. Login: password only, or mobile OTP (needs SMS gateway, client cost)? — default: email/mobile + password — P1 — open
11. Season vs FY: labour settlements are seasonal (Oct–Jun) but books are April–March. Settlement by date range OK? — default: settlement by date range, independent of FY — P6 — open
12. Mobile package ID / `--org` for `flutter create` — **whose developer account publishes the app?** The package id is baked in at the first store upload and is painful to change afterwards, so it must be settled before M0. — default used: `com.brics` (neutral placeholder, no company claimed) — M0/M6 — **open, needs an answer before M0**
13. Default permission set per role (ADM-06): which of the 9 roles may manage users, edit company settings and read the audit log? — default used in P1.1b: Owner & Super Admin get all four codes (company.view/manage, users.manage, audit.view); Accountant gets company.view + audit.view; Manager gets company.view + users.manage; Production Manager, Supervisor, Sales Executive and Store Keeper get company.view; Driver gets none. Editable in `packages/shared/src/constants/permissions.ts`, re-run `pnpm seed`. — P1 — open
14. SMS/WhatsApp alerts (NTF-01): the SOW excludes the *gateway charges* "(paid directly to MSG91/Twilio)", which implies the integration itself is in scope — is it? Which alerts (dispatch sent, payment received, advance limit crossed)? Who opens the MSG91/Twilio account? — default until answered: treated as CP1 ⚠️ blocked, not built — P13 — open
15. Is the ₹3.5–6 L/season ROI claim part of acceptance? If yes, LEK-01…04 (M13) are the acceptance demo and must be signed off with the client. Also still missing from the SOW: timeline, acceptance criteria, training, support/warranty period and payment milestones. — default: LEK-01…04 built in CP1 as the ROI evidence; commercial terms remain unwritten — P13 — open

