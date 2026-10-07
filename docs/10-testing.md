# 10 — Testing

| App | Tool | Command |
|---|---|---|
| Backend unit | Jest | `pnpm --filter @brics/backend test` |
| Backend e2e (from P1) | Jest + Supertest + test DB | `pnpm --filter @brics/backend test:e2e` |
| Web | Vitest + Testing Library | `pnpm --filter @brics/web test` |
| Web e2e (P13) | Playwright | `pnpm --filter @brics/web e2e` |
| Mobile | flutter_test + mocktail | `cd mobile && flutter test` |

## Must-have tests (no merge without them)
- **Posting:** every posting rule produces Σ Dr = Σ Cr with the right ledgers; reversal mirrors exactly; locked FY rejects.
- **Stock:** Opening + Production + Purchase − Sales − Wastage = Closing; insufficient stock rejected; idempotent replays don't double-move.
- **GST:** CGST+SGST vs IGST, rounding to paise, HSN summary totals.
- **Tenancy:** user of company A can never read or write company B (e2e).
- **Sync:** the same Idempotency-Key twice creates one record.

## Green gate (every session)
`pnpm lint && pnpm typecheck && pnpm test && pnpm build` + `flutter analyze && flutter test`.
